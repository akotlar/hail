package is.hail.expr.types.physical

import is.hail.annotations._
import is.hail.asm4s.{Code, MethodBuilder}

final case class PCanonicalInterval(pointType: PType, override val required: Boolean = false) extends PInterval {
    def _asIdent = s"interval_of_${pointType.asIdent}"
    def _toPretty = s"""Interval[$pointType]"""

    override def pyString(sb: StringBuilder): Unit = {
      sb.append("interval<")
      pointType.pyString(sb)
      sb.append('>')
    }
    override def _pretty(sb: StringBuilder, indent: Int, compact: Boolean = false) {
      sb.append("Interval[")
      pointType.pretty(sb, indent, compact)
      sb.append("]")
    }

    override val representation: PStruct = PStruct(
      required,
      "start" -> pointType,
      "end" -> pointType,
      "includesStart" -> PBooleanRequired,
      "includesEnd" -> PBooleanRequired)

    def copy(required: Boolean = this.required): PInterval = PCanonicalInterval(this.pointType, required)

    def startOffset(off: Code[Long]): Code[Long] = representation.fieldOffset(off, 0)

    def endOffset(off: Code[Long]): Code[Long] = representation.fieldOffset(off, 1)

    def loadStart(region: Region, off: Long): Long = representation.loadField(region, off, 0)

    def loadStart(region: Code[Region], off: Code[Long]): Code[Long] = representation.loadField(region, off, 0)

    def loadStart(rv: RegionValue): Long = loadStart(rv.region, rv.offset)

    def loadEnd(region: Region, off: Long): Long = representation.loadField(region, off, 1)

    def loadEnd(region: Code[Region], off: Code[Long]): Code[Long] = representation.loadField(region, off, 1)

    def loadEnd(rv: RegionValue): Long = loadEnd(rv.region, rv.offset)

    def startDefined(region: Region, off: Long): Boolean = representation.isFieldDefined(region, off, 0)

    def endDefined(region: Region, off: Long): Boolean = representation.isFieldDefined(region, off, 1)

    def includesStart(region: Region, off: Long): Boolean = Region.loadBoolean(representation.loadField(region, off, 2))

    def includesEnd(region: Region, off: Long): Boolean = Region.loadBoolean(representation.loadField(region, off, 3))

    def startDefined(off: Code[Long]): Code[Boolean] = representation.isFieldDefined(off, 0)

    def endDefined(off: Code[Long]): Code[Boolean] = representation.isFieldDefined(off, 1)

    def includeStart(off: Code[Long]): Code[Boolean] =
      Region.loadBoolean(representation.loadField(off, 2))

    def includeEnd(off: Code[Long]): Code[Boolean] =
      Region.loadBoolean(representation.loadField(off, 3))

    override def storeShallowAtOffset(dstAddress: Code[Long], valueAddress: Code[Long]): Code[Unit] =
      this.representation.storeShallowAtOffset(dstAddress, valueAddress)

    override def storeShallowAtOffset(dstAddress: Long, valueAddress: Long) {
      this.representation.storeShallowAtOffset(dstAddress, valueAddress)
    }

    override def copyFromType(mb: MethodBuilder, region: Code[Region], srcPType: PType, srcAddress: Code[Long],
      allowDowncast: Boolean, forceDeep: Boolean): Code[Long] = {
      assert(this isOfType srcPType)

      val srcRepPType = srcPType.asInstanceOf[PInterval].representation

      this.representation.copyFromType(mb, region, srcRepPType, srcAddress, allowDowncast, forceDeep)
    }

    override def copyFromType(region: Region, srcPType: PType, srcAddress: Long,
      allowDowncast: Boolean, forceDeep: Boolean): Long = {
      assert(this isOfType srcPType)

      val srcRepPType = srcPType.asInstanceOf[PInterval].representation

      this.representation.copyFromType(region, srcRepPType, srcAddress, allowDowncast, forceDeep)
    }
}
