package is.hail.expr.ir.functions

import is.hail.annotations.{Region, StagedRegionValueBuilder}
import is.hail.asm4s
import is.hail.asm4s._
import is.hail.expr.ir._
import is.hail.expr.types.physical.{PArray, PBoolean, PCanonicalArray, PCanonicalString, PInt32, PInt64, PSet, PString, PType}
import is.hail.expr.types.virtual._
import is.hail.utils._
import java.util.Locale
import java.time.{Instant, ZoneId}
import java.time.temporal.ChronoField

import org.json4s.JValue
import org.json4s.jackson.JsonMethods

import scala.collection.mutable

object StringFunctions extends RegistryFunctions {

  def reverse(s: String): String = {
    val sb = new StringBuilder
    sb.append(s)
    sb.reverseContents().result()
  }

  def upper(s: String): String = s.toUpperCase

  def lower(s: String): String = s.toLowerCase

  def strip(s: String): String = s.trim()

  def contains(s: String, t: String): Boolean = s.contains(t)

  def startswith(s: String, t: String): Boolean = s.startsWith(t)

  def endswith(s: String, t: String): Boolean = s.endsWith(t)

  def firstMatchIn(s: String, regex: String): IndexedSeq[String] = {
    regex.r.findFirstMatchIn(s).map(_.subgroups.toArray.toFastIndexedSeq).orNull
  }

  def regexMatch(regex: String, s: String): Boolean = regex.r.findFirstIn(s).isDefined

  def concat(s: String, t: String): String = s + t

  def replace(str: String, pattern1: String, pattern2: String): String =
    str.replaceAll(pattern1, pattern2)

  def split(s: String, p: String): IndexedSeq[String] = s.split(p, -1)

  def translate(s: String, d: Map[String, String]): String = {
    val charD = new mutable.HashMap[Char, String]
    d.foreach { case (k, v) =>
      if (k.length != 1)
        fatal(s"translate: mapping keys must be one character, found '$k'")
        charD += ((k(0), v))
    }

    val sb = new StringBuilder
    var i = 0
    while (i < s.length) {
      val charI = s(i)
      charD.get(charI) match {
        case Some(replacement) => sb.append(replacement)
        case None => sb.append(charI)
      }
      i += 1
    }
    sb.result()
  }

  def splitLimited(s: String, p: String, n: Int): IndexedSeq[String] = s.split(p, n)

  def arrayMkString(a: IndexedSeq[String], sep: String): String = a.mkString(sep)

  def setMkString(s: Set[String], sep: String): String = s.mkString(sep)

  def escapeString(s: String): String = StringEscapeUtils.escapeString(s)

  def softBounds(i: IR, len: IR): IR =
    If(i < -len, 0, If(i < 0, i + len, If(i >= len, len, i)))


  private val locale: Locale = Locale.US

  def strftime(fmtStr: String, epochSeconds: Long, zoneId: String): String =
    DateFormatUtils.parseDateFormat(fmtStr, locale).withZone(ZoneId.of(zoneId))
      .format(Instant.ofEpochSecond(epochSeconds))

  def strptime(timeStr: String, fmtStr: String, zoneId: String): Long =
    DateFormatUtils.parseDateFormat(fmtStr, locale).withZone(ZoneId.of(zoneId))
      .parse(timeStr)
      .getLong(ChronoField.INSTANT_SECONDS)

  def registerAll(): Unit = {
    val thisClass = getClass

    registerCode("length", TString, TInt32, (pt: PType) => pt) { case (r: EmitRegion, rt, (sT: PString, s: Code[Long])) =>
      asm4s.coerce[String](wrapArg(r, sT)(s)).invoke[Int]("length")
    }

    registerCode("substring", TString, TInt32, TInt32, TString, {
      (sT: PType, startT: PType, endT: PType) => PCanonicalString(sT.required && (startT.required || endT.required))
    }) {
      case (r: EmitRegion, rt, (sT: PString, s: Code[Long]), (startT, start: Code[Int]), (endT, end: Code[Int])) =>
      unwrapReturn(r, rt)(asm4s.coerce[String](wrapArg(r, sT)(s)).invoke[Int, Int, String]("substring", start, end))
    }

    registerIR("slice", TString, TInt32, TInt32, TString) { (str, start, end) =>
      val len = Ref(genUID(), TInt32)
      val s = Ref(genUID(), TInt32)
      val e = Ref(genUID(), TInt32)
      Let(len.name, invoke("length", TInt32, str),
        Let(s.name, softBounds(start, len),
          Let(e.name, softBounds(end, len),
            invoke("substring", TString, str, s, If(e < s, s, e)))))
    }

    registerIR("index", TString, TInt32, TString) { (s, i) =>
      val len = Ref(genUID(), TInt32)
      val idx = Ref(genUID(), TInt32)
      Let(len.name, invoke("length", TInt32, s),
        Let(idx.name,
          If((i < -len) || (i >= len),
            Die(invoke("concat", TString,
              Str("string index out of bounds: "),
              invoke("concat", TString,
                invoke("str", TString, i),
                invoke("concat", TString, Str(" / "), invoke("str", TString, len)))), TInt32),
            If(i < 0, i + len, i)),
        invoke("substring", TString, s, idx, idx + 1)))
    }

    registerIR("sliceRight", TString, TInt32, TString) { (s, start) => invoke("slice", TString, s, start, invoke("length", TInt32, s)) }
    registerIR("sliceLeft", TString, TInt32, TString) { (s, end) => invoke("slice", TString, s, I32(0), end) }

    registerCode("str", tv("T"), TString, (pt: PType) => PCanonicalString(pt.required)) { case (r, rt, (aT, a)) =>
      val annotation = boxArg(r, aT)(a)
      val str = r.mb.getType(aT.virtualType).invoke[Any, String]("str", annotation)
      unwrapReturn(r, rt)(str)
    }

    registerCodeWithMissingness("showStr", tv("T"), TInt32, TString, {
      (_: PType, truncType: PType) => PCanonicalString(truncType.required)
    }) { case (r, rt, (aT, a), (_, trunc)) =>
      val annotation = Code(a.setup, a.m).muxAny(Code._null(boxedTypeInfo(aT)), boxArg(r, aT)(a.v))
      val str = r.mb.getType(aT.virtualType).invoke[Any, Int, String]("showStr", annotation, trunc.value[Int])
      EmitCode(trunc.setup, trunc.m, PCode(rt, unwrapReturn(r, rt)(str)))
    }

    registerCodeWithMissingness("json", tv("T"), TString, (_: PType) => PCanonicalString(true)) { case (r, rt, (aT, a)) =>
      val bti = boxedTypeInfo(aT)
      val annotation = Code(a.setup, a.m).muxAny(Code._null(bti), boxArg(r, aT)(a.v))
      val json = r.mb.getType(aT.virtualType).invoke[Any, JValue]("toJSON", annotation)
      val str = Code.invokeScalaObject[JValue, String](JsonMethods.getClass, "compact", json)
      EmitCode(Code._empty, false, PCode(rt, unwrapReturn(r, rt)(str)))
    }

    registerWrappedScalaFunction("reverse", TString, TString, (pt: PType) => pt)(thisClass,"reverse")
    registerWrappedScalaFunction("upper", TString, TString, (pt: PType) => pt)(thisClass,"upper")
    registerWrappedScalaFunction("lower", TString, TString, (pt: PType) => pt)(thisClass,"lower")
    registerWrappedScalaFunction("strip", TString, TString, (pt: PType) => pt)(thisClass,"strip")
    registerWrappedScalaFunction("contains", TString, TString, TBoolean, {
      case (strPT: PType, substrPT: PType) => PBoolean(strPT.required && substrPT.required)
    })(thisClass, "contains")
    registerWrappedScalaFunction("translate", TString, TDict(TString, TString), TString, {
      case (strPT: PType, mapPT: PType) => strPT.orMissing(mapPT.required)
    })(thisClass, "translate")
    registerWrappedScalaFunction("startswith", TString, TString, TBoolean, {
      case (haystackPT: PType, needlePT: PType) => PBoolean(haystackPT.required && needlePT.required)
    })(thisClass, "startswith")
    registerWrappedScalaFunction("endswith", TString, TString, TBoolean, {
      case (haystackPT: PType, needlePT: PType) => PBoolean(haystackPT.required && needlePT.required)
    })(thisClass, "endswith")

    registerWrappedScalaFunction("regexMatch", TString, TString, TBoolean, {
      case (strPT: PType, regexPT: PType) => PBoolean(strPT.required && regexPT.required)
    })(thisClass, "regexMatch")

    registerWrappedScalaFunction("concat", TString, TString, TString, {
      case (str1PT: PType, str2PT: PType) => InferPType.getNestedElementPTypes(Seq(str1PT, str2PT))
    })(thisClass, "concat")

    registerWrappedScalaFunction("split", TString, TString, TArray(TString), {
      case (strPT: PType, delimPT: PType) => {
        val elemPType = InferPType.getNestedElementPTypes(Seq(strPT, delimPT))
        PCanonicalArray(elemPType, elemPType.required)
      }
    })(thisClass, "split")

    registerWrappedScalaFunction("split", TString, TString, TInt32, TArray(TString), {
      case (strPT: PType, delimPT: PType, limitPT: PType) => {
        val elemPType = InferPType.getNestedElementPTypes(Seq(strPT, delimPT))
        PCanonicalArray(elemPType, elemPType.required && limitPT.required)
      }
    })(thisClass, "splitLimited")

    registerWrappedScalaFunction("replace", TString, TString, TString, TString, {
      case (st1: PType, st2: PType, st3: PType) => InferPType.getNestedElementPTypes(Seq(st1, st2, st3))
    })(thisClass, "replace")

    registerWrappedScalaFunction("mkString", TSet(TString), TString, TString, {
      case(strSetPT: PType, delimPT: PType) => strSetPT.asInstanceOf[PSet].elementType.orMissing(delimPT.required)
    })(thisClass, "setMkString")

    registerWrappedScalaFunction("mkString", TArray(TString), TString, TString, {
      case(strSetPT: PType, delimPT: PType) => strSetPT.asInstanceOf[PArray].elementType.orMissing(delimPT.required)
    })(thisClass, "arrayMkString")

    registerCodeWithMissingness("firstMatchIn", TString, TString, TArray(TString), {
      case(sT: PType, _: PType) => PCanonicalArray(sT.setRequired(false))
    }) {
      case (er: EmitRegion, rt: PArray, (sT: PString, s: EmitCode), (rT: PString, r: EmitCode)) =>
      val out: LocalRef[IndexedSeq[String]] = er.mb.newLocal[IndexedSeq[String]]()

      val srvb: StagedRegionValueBuilder = new StagedRegionValueBuilder(er, rt)
      val len: LocalRef[Int] = er.mb.newLocal[Int]()
      val elt: LocalRef[String] = er.mb.newLocal[String]()

      val setup = Code(s.setup, r.setup)
      val missing = s.m || r.m || Code(
        out := Code.invokeScalaObject[String, String, IndexedSeq[String]](
          thisClass, "firstMatchIn",
          asm4s.coerce[String](wrapArg(er, sT)(s.value[Long])),
          asm4s.coerce[String](wrapArg(er, rT)(r.value[Long]))),
        out.isNull)
      val value =
        out.ifNull(
          defaultValue(TArray(TString)),
          Code(
            len := out.invoke[Int]("size"),
            srvb.start(len),
            Code.whileLoop(srvb.arrayIdx < len,
              elt := out.invoke[Int, String]("apply", srvb.arrayIdx),
              elt.ifNull(
                srvb.setMissing(),
                srvb.addString(elt)),
              srvb.advance()),
            srvb.end()))

      EmitCode(setup, missing, PCode(rt, value))
    }

    registerCodeWithMissingness("hamming", TString, TString, TInt32, {
      case(_: PType, _: PType) => PInt32()
    }) {
      case (r: EmitRegion, rt, (e1T: PString, e1: EmitCode), (e2T: PString, e2: EmitCode)) =>
      val len = r.mb.newLocal[Int]()
      val i = r.mb.newLocal[Int]()
      val n = r.mb.newLocal[Int]()

      val v1 = r.mb.newLocal[Long]()
      val v2 = r.mb.newLocal[Long]()

      val m = Code(
        v1 := e1.value[Long],
        v2 := e2.value[Long],
        len := e1T.loadLength(v1),
        len.cne(e2T.loadLength(v2)))
      val v =
        Code(n := 0,
          i := 0,
          Code.whileLoop(i < len,
            Region.loadByte(e1T.bytesAddress(v1) + i.toL)
              .cne(Region.loadByte(e2T.bytesAddress(v2) + i.toL)).mux(
              n += 1,
              Code._empty),
            i += 1),
          n)

        EmitCode(
          Code(e1.setup, e2.setup),
          e1.m || e2.m || m,
          PCode(rt, v))
    }

    registerWrappedScalaFunction("escapeString", TString, TString, (pt: PType) => pt)(thisClass, "escapeString")
    registerWrappedScalaFunction("strftime", TString, TInt64, TString, TString, {
      case(fmtPT: PType, timestampPT: PType, zonePT: PType) => PCanonicalString(fmtPT.required && timestampPT.required && zonePT.required)
    })(thisClass, "strftime")
    registerWrappedScalaFunction("strptime", TString, TString, TString, TInt64, {
      case(timePT: PType, fmtPT: PType, zonePT: PType) => PInt64(timePT.required && fmtPT.required && zonePT.required)
    })(thisClass, "strptime")
  }
}
