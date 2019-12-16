package is.hail.expr.types.physical

import is.hail.annotations.{CodeOrdering, Region}
import is.hail.asm4s.Code
import is.hail.expr.ir.{EmitMethodBuilder, SortOrder}
import is.hail.expr.types.BaseStruct
import is.hail.expr.types.virtual.{TTuple, TupleField}
import is.hail.utils._

case class PTupleField(index: Int, typ: PType)

object PTuple {
  def apply(required: Boolean, args: PType*): PTuple = PCanonicalTuple(args.iterator.zipWithIndex.map { case (t, i) => PTupleField(i, t)}.toFastIndexedSeq, required)

  def apply(args: IndexedSeq[PTupleField], required: Boolean = false): PTuple = PCanonicalTuple(args, required)

  def apply(args: PType*): PTuple = PCanonicalTuple(args.zipWithIndex.map { case (a, i) => PTupleField(i, a)}.toFastIndexedSeq, required = false)
}

abstract class PTuple extends PBaseStruct {
  def _types: IndexedSeq[PTupleField]

  lazy val virtualType: TTuple = TTuple(_types.map(tf => TupleField(tf.index, tf.typ.virtualType)), required)
  lazy val fields: IndexedSeq[PField] = types.zipWithIndex.map { case (t, i) => PField(s"$i", t, i) }
  lazy val nFields: Int = fields.size

  final def codeOrdering(mb: EmitMethodBuilder, other: PType): CodeOrdering =
    codeOrdering(mb, other, null)

  final def codeOrdering(mb: EmitMethodBuilder, other: PType, so: Array[SortOrder]): CodeOrdering = {
    assert(other isOfType this)
    assert(so == null || so.size == types.size)
    CodeOrdering.rowOrdering(this, other.asInstanceOf[PTuple], mb, so)
  }

  override def pyString(sb: StringBuilder): Unit = {
    sb.append("tuple(")
    fields.foreachBetween({ field =>
      field.typ.pyString(sb)
    }) { sb.append(", ")}
    sb.append(')')
  }

  def identBase: String = "tuple"

  def copy(required: Boolean): PTuple

  def fieldIndex: Map[Int, Int]
}

class CodePTuple(
  val pType: PTuple,
  val region: Code[Region],
  val offset: Code[Long]
) {
  def apply[T](i: Int): Code[T] =
    Region.loadIRIntermediate(pType.types(i))(
      pType.loadField(offset, i)
    ).asInstanceOf[Code[T]]

  def isMissing(i: Int): Code[Boolean] = {
    pType.isFieldMissing(offset, i)
  }

  def withTypesAndIndices = (0 until pType.nFields).map(i => (pType.types(i), apply(i), i))

  def withTypes = withTypesAndIndices.map(x => (x._1, x._2))

  def missingnessPattern = (0 until pType.nFields).map(isMissing(_))

  def values[T, U, V] = {
    assert(pType.nFields == 3)
    (apply[T](0), apply[U](1), apply[V](2))
  }
}
