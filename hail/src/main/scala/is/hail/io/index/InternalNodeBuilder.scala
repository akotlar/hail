package is.hail.io.index

import is.hail.annotations.RegionValueBuilder
import is.hail.expr.types.physical.{PArray, PInt64, PStruct, PType}
import is.hail.expr.types.virtual.{TArray, TInt64, TStruct, Type}
import is.hail.utils.ArrayBuilder

object InternalNodeBuilder {
  def ptyp(keyType: PType, annotationType: PType) = PStruct(
    "children" -> PArray(PStruct(
      "index_file_offset" -> PInt64(required = true),
      "first_idx" -> PInt64(required = true),
      "first_key" -> keyType,
      "first_record_offset" -> PInt64(required = true),
      "first_annotation" -> annotationType
    ), required = true)
  )
}

class InternalNodeBuilder(keyType: PType, annotationType: PType) {
  val indexFileOffsets = new ArrayBuilder[Long]()
  val firstIdxs = new ArrayBuilder[Long]()
  val firstKeys = new ArrayBuilder[Any]()
  val firstRecordOffsets = new ArrayBuilder[Long]()
  val firstAnnotations = new ArrayBuilder[Any]()

  var size = 0
  val typ = InternalNodeBuilder.ptyp(keyType, annotationType)

  def +=(info: IndexNodeInfo) {
    indexFileOffsets += info.indexFileOffset
    firstIdxs += info.firstIndex
    firstKeys += info.firstKey
    firstRecordOffsets += info.firstRecordOffset
    firstAnnotations += info.firstAnnotation
    size += 1
  }

  def write(rvb: RegionValueBuilder): Long = {
    rvb.start(typ)
    rvb.startStruct()
    rvb.startArray(size)
    var i = 0
    while (i < size) {
      rvb.startStruct()
      rvb.addLong(indexFileOffsets(i))
      rvb.addLong(firstIdxs(i))
      rvb.addAnnotation(keyType.virtualType, firstKeys(i))
      rvb.addLong(firstRecordOffsets(i))
      rvb.addAnnotation(annotationType.virtualType, firstAnnotations(i))
      rvb.endStruct()
      i += 1
    }
    rvb.endArray()
    rvb.endStruct()
    rvb.end()
  }

  def clear() {
    indexFileOffsets.clear()
    firstIdxs.clear()
    firstKeys.clear()
    firstRecordOffsets.clear()
    firstAnnotations.clear()
    size = 0
  }

  def getChild(idx: Int): InternalChild = {
    assert(idx >= 0 && idx < size)
    InternalChild(indexFileOffsets(idx), firstIdxs(idx), firstKeys(idx), firstRecordOffsets(idx), firstAnnotations(idx))
  }

  override def toString: String = s"InternalNodeBuilder $size [${ (0 until size).map { i =>
    (indexFileOffsets(i), firstIdxs(i), firstKeys(i), firstRecordOffsets(i), firstAnnotations(i))
  }.mkString(",") }]"
}
