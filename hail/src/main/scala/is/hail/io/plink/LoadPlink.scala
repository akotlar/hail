package is.hail.io.plink

import is.hail.HailContext
import is.hail.annotations._
import is.hail.expr.ir.{MatrixRead, MatrixReader, MatrixValue, PruneDeadFields}
import is.hail.expr.types._
import is.hail.expr.types.virtual._
import is.hail.io.vcf.LoadVCF
import is.hail.rvd.{RVD, RVDContext, RVDType}
import is.hail.sparkextras.ContextRDD
import is.hail.utils.StringEscapeUtils._
import is.hail.utils._
import is.hail.variant.{Locus, _}
import org.apache.hadoop
import org.apache.hadoop.conf.Configuration
import org.apache.hadoop.io.LongWritable
import org.apache.spark.sql.Row

case class FamFileConfig(isQuantPheno: Boolean = false,
  delimiter: String = "\\t",
  missingValue: String = "NA")

object LoadPlink {
  def expectedBedSize(nSamples: Int, nVariants: Long): Long = 3 + nVariants * ((nSamples + 3) / 4)

  def parseBim(bimPath: String, hConf: Configuration, a2Reference: Boolean = true,
    contigRecoding: Map[String, String] = Map.empty[String, String]): Array[(String, Int, Double, String, String, String)] = {
    hConf.readLines(bimPath)(_.map(_.map { line =>
      line.split("\\s+") match {
        case Array(contig, rsId, cmPos, bpPos, allele1, allele2) =>
          val recodedContig = contigRecoding.getOrElse(contig, contig)
          if (a2Reference)
            (recodedContig, bpPos.toInt, cmPos.toDouble, allele2, allele1, rsId)
          else
            (recodedContig, bpPos.toInt, cmPos.toDouble, allele1, allele2, rsId)

        case other => fatal(s"Invalid .bim line.  Expected 6 fields, found ${ other.length } ${ plural(other.length, "field") }")
      }
    }.value
    ).toArray)
  }

  val numericRegex =
    """^-?(?:\d+|\d*\.\d+)(?:[eE]-?\d+)?$""".r

  def parseFam(filename: String, ffConfig: FamFileConfig,
    hConf: hadoop.conf.Configuration): (IndexedSeq[Row], TStruct) = {

    val delimiter = unescapeString(ffConfig.delimiter)

    val phenoSig = if (ffConfig.isQuantPheno) ("quant_pheno", TFloat64()) else ("is_case", TBoolean())

    val signature = TStruct(("id", TString()), ("fam_id", TString()), ("pat_id", TString()),
      ("mat_id", TString()), ("is_female", TBoolean()), phenoSig)

    val idBuilder = new ArrayBuilder[String]
    val structBuilder = new ArrayBuilder[Row]

    val m = hConf.readLines(filename) {
      _.foreachLine { line =>
        val split = line.split(delimiter)
        if (split.length != 6)
          fatal(s"expected 6 fields, but found ${ split.length }")
        val Array(fam, kid, dad, mom, isFemale, pheno) = split

        val fam1 = if (fam != "0") fam else null
        val dad1 = if (dad != "0") dad else null
        val mom1 = if (mom != "0") mom else null

        val isFemale1 = isFemale match {
          case ffConfig.missingValue => null
          case "-9" => null
          case "0" => null
          case "1" => false
          case "2" => true
          case _ => fatal(s"Invalid sex: `$isFemale'. Male is `1', female is `2', unknown is `0'")
        }

        var warnedAbout9 = false
        val pheno1 =
          if (ffConfig.isQuantPheno)
            pheno match {
              case ffConfig.missingValue => null
              case "-9" =>
                if (!warnedAbout9) {
                  warn(
                    s"""Interpreting value '-9' as a valid quantitative phenotype, which differs from default PLINK behavior.
                       |  Use missing='-9' to interpret '-9' as a missing value.""".stripMargin)
                  warnedAbout9 = true
                }
                -9d
              case numericRegex() => pheno.toDouble
              case _ => fatal(s"Invalid quantitative phenotype: `$pheno'. Value must be numeric or `${ ffConfig.missingValue }'")
            }
          else
            pheno match {
              case ffConfig.missingValue => null
              case "1" => false
              case "2" => true
              case "0" => null
              case "-9" => null
              case "N/A" => null
              case numericRegex() => fatal(s"Invalid case-control phenotype: `$pheno'. Control is `1', case is `2', missing is `0', `-9', `${ ffConfig.missingValue }', or non-numeric.")
              case _ => null
            }
        idBuilder += kid
        structBuilder += Row(kid, fam1, dad1, mom1, isFemale1, pheno1)
      }
    }

    val sampleIds = idBuilder.result()
    LoadVCF.warnDuplicates(sampleIds)

    if (sampleIds.isEmpty)
      fatal("Empty FAM file")

    (structBuilder.result(), signature)
  }
}

case class MatrixPLINKReader(
  bed: String,
  bim: String,
  fam: String,
  nPartitions: Option[Int] = None,
  delimiter: String = "\\\\s+",
  missing: String = "NA",
  quantPheno: Boolean = false,
  a2Reference: Boolean = true,
  rg: Option[String],
  contigRecoding: Map[String, String] = Map.empty[String, String],
  skipInvalidLoci: Boolean = false
) extends MatrixReader {
  private val hc = HailContext.get
  private val sc = hc.sc
  private val referenceGenome = rg.map(ReferenceGenome.getReference)
  referenceGenome.foreach(_.validateContigRemap(contigRecoding))

  val ffConfig = FamFileConfig(quantPheno, delimiter, missing)

  val (sampleInfo, signature) = LoadPlink.parseFam(fam, ffConfig, hc.hadoopConf)

  val nameMap = Map("id" -> "s")
  val saSignature = signature.copy(fields = signature.fields.map(f => f.copy(name = nameMap.getOrElse(f.name, f.name))))

  val nSamples = sampleInfo.length
  if (nSamples <= 0)
    fatal("FAM file does not contain any samples")

  val variants = LoadPlink.parseBim(bim, hc.hadoopConf, a2Reference, contigRecoding)
  val nVariants = variants.length
  if (nVariants <= 0)
    fatal("BIM file does not contain any variants")

  info(s"Found $nSamples samples in fam file.")
  info(s"Found $nVariants variants in bim file.")

  hc.sc.hadoopConfiguration.readFile(bed) { dis =>
    val b1 = dis.read()
    val b2 = dis.read()
    val b3 = dis.read()

    if (b1 != 108 || b2 != 27)
      fatal("First two bytes of BED file do not match PLINK magic numbers 108 & 27")

    if (b3 == 0)
      fatal("BED file is in individual major mode. First use plink with --make-bed to convert file to snp major mode before using Hail")
  }

  val bedSize = hc.sc.hadoopConfiguration.getFileSize(bed)
  if (bedSize != LoadPlink.expectedBedSize(nSamples, nVariants))
    fatal("BED file size does not match expected number of bytes based on BIM and FAM files")

  if (bedSize < nPartitions.getOrElse(hc.sc.defaultMinPartitions))
    fatal(s"The number of partitions requested (${ nPartitions.getOrElse(hc.sc.defaultMinPartitions) }) is greater than the file size ($bedSize)")

  val columnCount: Option[Int] = Some(nSamples)

  val partitionCounts: Option[IndexedSeq[Long]] = None

  val fullType: MatrixType = MatrixType.fromParts(
    globalType = TStruct.empty(),
    colKey = Array("s"),
    colType = saSignature,
    rowType = TStruct(
      "locus" -> TLocus.schemaFromRG(referenceGenome),
      "alleles" -> TArray(TString()),
      "rsid" -> TString(),
      "cm_position" -> TFloat64()),
    rowKey = Array("locus", "alleles"),
    entryType = TStruct("GT" -> TCall()))

  val fullRVDType: RVDType = fullType.canonicalRVDType

  def apply(mr: MatrixRead): MatrixValue = {
    val requestedType = mr.typ
    assert(PruneDeadFields.isSupertype(requestedType, fullType))

    val rvd = if (mr.dropRows)
      RVD.empty(sc, requestedType.canonicalRVDType)
    else {
      val variantsBc = sc.broadcast(variants)
      sc.hadoopConfiguration.setInt("nSamples", nSamples)
      sc.hadoopConfiguration.setBoolean("a2Reference", a2Reference)

      val crdd = ContextRDD.weaken[RVDContext](
        sc.hadoopFile(
          bed,
          classOf[PlinkInputFormat],
          classOf[LongWritable],
          classOf[PlinkRecord],
          nPartitions.getOrElse(sc.defaultMinPartitions)))

      val kType = requestedType.canonicalRVDType.kType
      val rvRowType = requestedType.rvRowType

      val hasRsid = requestedType.rowType.hasField("rsid")
      val hasCmPos = requestedType.rowType.hasField("cm_position")
      val hasGT = requestedType.entryType.hasField("GT")

      val skipInvalidLociLocal = skipInvalidLoci
      val rgLocal = referenceGenome

      val fastKeys = crdd.cmapPartitions { (ctx, it) =>
        val region = ctx.region
        val rvb = new RegionValueBuilder(region)
        val rv = RegionValue(region)

        it.flatMap { case (_, record) =>
          val (contig, pos, _, ref, alt, _) = variantsBc.value(record.getKey)
          if (skipInvalidLociLocal && !rgLocal.forall(_.isValidLocus(contig, pos)))
            None
          else {
            rvb.start(kType)
            rvb.startStruct()
            rvb.addAnnotation(kType.types(0).virtualType, Locus.annotation(contig, pos, rgLocal))
            rvb.startArray(2)
            rvb.addString(ref)
            rvb.addString(alt)
            rvb.endArray()
            rvb.endStruct()

            rv.setOffset(rvb.end())
            Some(rv)
          }
        }
      }

      val rdd2 = crdd.cmapPartitions { (ctx, it) =>
        val region = ctx.region
        val rvb = new RegionValueBuilder(region)
        val rv = RegionValue(region)

        it.flatMap { case (_, record) =>
          val (contig, pos, cmPos, ref, alt, rsid) = variantsBc.value(record.getKey)

          if (skipInvalidLociLocal && !rgLocal.forall(_.isValidLocus(contig, pos)))
            None
          else {
            rvb.start(rvRowType.physicalType)
            rvb.startStruct()
            rvb.addAnnotation(kType.types(0).virtualType, Locus.annotation(contig, pos, rgLocal))
            rvb.startArray(2)
            rvb.addString(ref)
            rvb.addString(alt)
            rvb.endArray()
            if (hasRsid)
              rvb.addAnnotation(rvRowType.types(2), rsid)
            if (hasCmPos)
              rvb.addDouble(cmPos)
            record.getValue(rvb, hasGT)
            rvb.endStruct()

            rv.setOffset(rvb.end())
            Some(rv)
          }
        }
      }

      RVD.coerce(requestedType.canonicalRVDType, rdd2, fastKeys)
    }

    if (skipInvalidLoci && referenceGenome.isDefined) {
      val nFiltered = rvd.count() - nVariants
      if (nFiltered > 0)
        info(s"Filtered out $nFiltered ${ plural(nFiltered, "variant") } that are inconsistent with reference genome '${ referenceGenome.get.name }'.")
    }

    MatrixValue(requestedType,
      BroadcastRow(Row.empty, requestedType.globalType, sc),
      BroadcastIndexedSeq(if (mr.dropCols) Array.empty[Annotation] else sampleInfo, TArray(requestedType.colType), sc),
      rvd
    )
  }
}
