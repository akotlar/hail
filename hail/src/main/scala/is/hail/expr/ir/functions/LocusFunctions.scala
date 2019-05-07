package is.hail.expr.ir.functions

import is.hail.annotations.{Region, StagedRegionValueBuilder}
import is.hail.asm4s._
import is.hail.expr.types._
import is.hail.expr.types
import is.hail.asm4s
import is.hail.expr.ir.EmitMethodBuilder
import is.hail.variant._
import is.hail.expr.ir._
import is.hail.expr.types.physical._
import is.hail.expr.types.virtual._
import is.hail.utils._

object LocusFunctions extends RegistryFunctions {

  def getLocus(r: EmitRegion, locus: Code[Long], typeString: String): Code[Locus] = {
    val tlocus = types.coerce[TLocus](tv(typeString).t)
    Code.checkcast[Locus](wrapArg(r, tlocus)(locus).asInstanceOf[Code[AnyRef]])
  }

  def registerLocusCode(methodName: String): Unit = {
    registerCode(methodName, tv("T", "locus"), TBoolean()) {
      case (r: EmitRegion, locus: Code[Long]) =>
        val locusObject = getLocus(r, locus, "T")
        val tlocus = types.coerce[TLocus](tv("T").t)
        val rg = tlocus.rg.asInstanceOf[ReferenceGenome]

        val codeRG = r.mb.getReferenceGenome(rg)
        unwrapReturn(r, TBoolean())(locusObject.invoke[RGBase, Boolean](methodName, codeRG))
    }
  }

  def registerAll() {
    registerCode("contig", tv("T", "locus"), TString()) {
      case (r, locus: Code[Long]) =>
        val tlocus = types.coerce[TLocus](tv("T").t).physicalType
        tlocus.contig(r.region, locus)
    }

    registerCode("position", tv("T", "locus"), TInt32()) {
      case (r, locus: Code[Long]) =>
        val tlocus = types.coerce[TLocus](tv("T").t).physicalType
        tlocus.position(r.region, locus)
    }

    registerLocusCode("isAutosomalOrPseudoAutosomal")
    registerLocusCode("isAutosomal")
    registerLocusCode("inYNonPar")
    registerLocusCode("inXPar")
    registerLocusCode("isMitochondrial")
    registerLocusCode("inXNonPar")
    registerLocusCode("inYPar")

    registerCode("min_rep", tv("T", "locus"), TArray(TString()), TStruct("locus" -> tv("T"), "alleles" -> TArray(TString()))) { (r, lOff, aOff) =>
      val returnTuple = r.mb.newLocal[(Locus, IndexedSeq[String])]
      val locus = getLocus(r, lOff, "T")
      val alleles = Code.checkcast[IndexedSeq[String]](wrapArg(r, TArray(TString()))(aOff).asInstanceOf[Code[AnyRef]])
      val tuple = Code.invokeScalaObject[Locus, IndexedSeq[String], (Locus, IndexedSeq[String])](VariantMethods.getClass, "minRep", locus, alleles)

      val newLocus = Code.checkcast[Locus](returnTuple.load().get[java.lang.Object]("_1"))
      val newAlleles = Code.checkcast[IndexedSeq[String]](returnTuple.load().get[java.lang.Object]("_2"))

      val srvb = new StagedRegionValueBuilder(r, PTuple(FastIndexedSeq(tv("T").t.physicalType, PArray(PString()))))
      Code(
        returnTuple := tuple,
        srvb.start(),
        srvb.addBaseStruct(types.coerce[PBaseStruct](tv("T").t.fundamentalType.physicalType), { locusBuilder =>
          Code(
            locusBuilder.start(),
            locusBuilder.addString(newLocus.invoke[String]("contig")),
            locusBuilder.advance(),
            locusBuilder.addInt(newLocus.invoke[Int]("position")))
        }),
        srvb.advance(),
        srvb.addArray(PArray(PString()), { allelesBuilder =>
          Code(
            allelesBuilder.start(newAlleles.invoke[Int]("size")),
            Code.whileLoop(allelesBuilder.arrayIdx < newAlleles.invoke[Int]("size"),
              allelesBuilder.addString(Code.checkcast[String](newAlleles.invoke[Int, java.lang.Object]("apply", allelesBuilder.arrayIdx))),
              allelesBuilder.advance()))
        }),
        srvb.offset)
    }

    registerCode("locus_windows_per_contig", TArray(TArray(TFloat64())), TFloat64(), TTuple(TArray(TInt32()), TArray(TInt32()))) {
      (r: EmitRegion, coords: Code[Long], radius: Code[Double]) =>
        val region: Code[Region] = r.region

        val groupedt = PArray(PArray(PFloat64()))
        val coordt = types.coerce[PArray](groupedt.elementType)
        val rt = PTuple(FastIndexedSeq(PArray(PInt64()), PArray(PInt64())))

        val ncontigs = r.mb.newLocal[Int]("ncontigs")
        val totalLen = r.mb.newLocal[Int]("l")
        val iContig = r.mb.newLocal[Int]

        val len = r.mb.newLocal[Int]("l")
        val i = r.mb.newLocal[Int]("i")
        val idx = r.mb.newLocal[Int]("i")
        val coordsPerContig = r.mb.newLocal[Long]("coords")
        val offset = r.mb.newLocal[Int]("offset")
        val lastCoord = r.mb.newLocal[Double]("coord")

        val getCoord = { i: Code[Int] =>
          asm4s.coerce[Double](region.loadIRIntermediate(PFloat64())(coordt.elementOffset(coordsPerContig, len, i)))
        }

        def forAllContigs(c: Code[Unit]): Code[Unit] = {
          Code(iContig := 0,
            Code.whileLoop(iContig < ncontigs,
              coordsPerContig := asm4s.coerce[Long](
                region.loadIRIntermediate(coordt)(
                  groupedt.elementOffset(coords, ncontigs, iContig))),
              c,
              iContig += 1))
        }

        val startCond = getCoord(i) > (getCoord(idx) + radius)
        val endCond = getCoord(i) >= (getCoord(idx) - radius)

        val addIdxWithCondition = { (cond: Code[Boolean], sab: StagedRegionValueBuilder) =>
          Code(
            sab.start(totalLen),
            offset := 0,
            forAllContigs(
              Code(
                i := 0,
                idx := 0,
                len := coordt.loadLength(region, coordsPerContig),
                len.ceq(0).mux(lastCoord := 0.0, lastCoord := getCoord(0)),
                Code.whileLoop(i < len,
                  coordt.isElementMissing(region, coordsPerContig, i).mux(
                    Code._fatal(
                      const("locus_windows: missing value for 'coord_expr' at row ")
                        .concat((offset + i).toS)),
                      (lastCoord > getCoord(i)).mux(
                        Code._fatal("locus_windows: 'coord_expr' must be in ascending order within each contig."),
                        lastCoord := getCoord(i))),
                    Code.whileLoop((idx < len) && cond, idx += 1),
                  sab.addInt(offset + idx),
                  sab.advance(),
                  i += 1),
                offset := offset + len)))
        }

        val srvb = new StagedRegionValueBuilder(r, rt)
        Code(
          ncontigs := groupedt.loadLength(region, coords),
          totalLen := 0,
          forAllContigs(totalLen := totalLen + coordt.loadLength(region, coordsPerContig)),
          srvb.start(),
          srvb.addArray(PArray(PInt32()), addIdxWithCondition(startCond, _)),
          srvb.advance(),
          srvb.addArray(PArray(PInt32()), addIdxWithCondition(endCond, _)),
          srvb.end())
    }
  }
}
