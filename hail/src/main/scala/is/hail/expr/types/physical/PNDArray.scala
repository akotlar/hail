package is.hail.expr.types.physical

import is.hail.annotations.{CodeOrdering, Region, StagedRegionValueBuilder}
import is.hail.asm4s.{Code, MethodBuilder, _}
import is.hail.expr.Nat
import is.hail.expr.ir.{EmitMethodBuilder}
import is.hail.expr.types.virtual.TNDArray

final class StaticallyKnownField[T, U](
  val pType: T,
  val load: (Code[Region], Code[Long]) => Code[U]
)

object PNDArray {
  def apply(elementType: PType, nDims: Int, required: Boolean = false) = PCanonicalNDArray(elementType, nDims, required)
}

abstract class PNDArray extends PType {
  val nDims: Int
  val elementType: PType

  lazy val virtualType: TNDArray = TNDArray(elementType.virtualType, Nat(nDims), required)

  override def codeOrdering(mb: EmitMethodBuilder, other: PType): CodeOrdering = throw new UnsupportedOperationException

  val flags: StaticallyKnownField[PInt32Required.type, Int]
  val offset: StaticallyKnownField[PInt32Required.type, Int]
  val shape: StaticallyKnownField[PTuple, Long]
  val strides: StaticallyKnownField[PTuple, Long]
  val data: StaticallyKnownField[PArray, Long]

  val representation: PStruct

  def numElements(shape: Array[Code[Long]], mb: MethodBuilder): Code[Long]

  def makeDefaultStridesBuilder(sourceShapeArray: Array[Code[Long]], mb: MethodBuilder): StagedRegionValueBuilder => Code[Unit]

  def getElementAddress(indices: Array[Code[Long]], nd: Code[Long], region: Code[Region], mb: MethodBuilder): Code[Long]

  def loadElementToIRIntermediate(indices: Array[Code[Long]], ndAddress: Code[Long], region: Code[Region], mb: MethodBuilder): Code[_]

  def outOfBounds(indices: Array[Code[Long]], nd: Code[Long], region: Code[Region], mb: MethodBuilder): Code[Boolean]

  def linearizeIndices(indices: Array[Code[Long]], shapeArray: Array[Code[Long]], region: Code[Region], mb: MethodBuilder): Code[Long]

  def unlinearizeIndex(index: Code[Long], shapeArray: Array[Code[Long]], region: Code[Region], mb: MethodBuilder): (Code[Unit], Array[Code[Long]])

  def construct(flags: Code[Int], offset: Code[Int], shapeBuilder: (StagedRegionValueBuilder => Code[Unit]),
    stridesBuilder: (StagedRegionValueBuilder => Code[Unit]), data: Code[Long], mb: MethodBuilder): Code[Long]
}
