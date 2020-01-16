package is.hail.expr.types.physical

import is.hail.annotations.{Region, UnsafeOrdering}
import is.hail.asm4s.{Code, MethodBuilder}

abstract class ComplexPType extends PType {
  val representation: PType

  override def byteSize: Long = representation.byteSize

  override def alignment: Long = representation.alignment

  override def unsafeOrdering(): UnsafeOrdering = representation.unsafeOrdering()

  override def fundamentalType: PType = representation.fundamentalType

  override def containsPointers: Boolean = representation.containsPointers

  override def storeShallowAtOffset(dstAddress: Code[Long], valueAddress: Code[Long]): Code[Unit] =
    this.representation.storeShallowAtOffset(dstAddress, valueAddress)

  override def storeShallowAtOffset(dstAddress: Long, valueAddress: Long) {
    this.representation.storeShallowAtOffset(dstAddress, valueAddress)
  }

  override def copyFromType(mb: MethodBuilder, region: Code[Region], srcPType: PType, srcAddress: Code[Long], forceDeep: Boolean): Code[Long] = {
    assert(this isOfType srcPType)

    val srcRepPType = srcPType.asInstanceOf[ComplexPType].representation

    this.representation.copyFromType(mb, region, srcRepPType, srcAddress, forceDeep)
  }
}
