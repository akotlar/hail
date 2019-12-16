package is.hail.expr.types.physical
import is.hail.utils._

final case class PCanonicalTuple(_types: IndexedSeq[PTupleField], override val required: Boolean = false) extends PTuple with PCanonicalBaseStruct {
  val types = _types.map(_.typ).toArray

  lazy val fieldIndex: Map[Int, Int] = _types.zipWithIndex.map { case (tf, idx) => tf.index -> idx }.toMap

  def copy(required: Boolean = this.required): PTuple = PCanonicalTuple(_types, required)

  override def truncate(newSize: Int): PTuple =
    PCanonicalTuple(_types.take(newSize), required)

  override def _pretty(sb: StringBuilder, indent: Int, compact: Boolean) {
    sb.append("Tuple[")
    types.foreachBetween(_.pretty(sb, indent, compact))(sb += ',')
    sb += ']'
  }

  override val fundamentalType: PTuple = {
    val fundamentalFieldTypes = _types.map(tf => tf.copy(typ = tf.typ.fundamentalType))
    if ((_types, fundamentalFieldTypes).zipped
      .forall { case (t, ft) => t == ft })
      this
    else
      PCanonicalTuple(fundamentalFieldTypes, required)
  }
}