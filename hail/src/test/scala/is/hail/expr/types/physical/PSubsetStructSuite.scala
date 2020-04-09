package is.hail.expr.types.physical

import is.hail.HailSuite
import is.hail.annotations.{Region, RegionValue, StagedRegionValueBuilder}
import is.hail.asm4s.Code
import is.hail.expr.ir.EmitFunctionBuilder
import org.testng.annotations.Test

class PSubsetStructSuite extends HailSuite {
  val debug = true

  @Test def testSubsetStruct() {
    val rt = PCanonicalStruct("a" -> PCanonicalString(), "b" -> PInt32(), "c" -> PInt64())
    val intInput = 3
    val longInput = 4L
    val fb = EmitFunctionBuilder[Region, Int, Long, Long]("fb")
    val srvb = new StagedRegionValueBuilder(fb, rt)

    fb.emit(
      Code(
        srvb.start(),
        srvb.addString("hello"),
        srvb.advance(),
        srvb.addInt(fb.getCodeParam[Int](2)),
        srvb.advance(),
        srvb.addLong(fb.getCodeParam[Long](3)),
        srvb.end()
      )
    )

    val region = Region()
    val rv = RegionValue(region)
    rv.setOffset(fb.result()()(region, intInput, longInput))

    if (debug) {
      println(rv.pretty(rt))
    }

    val view = PSubsetStruct(rt, IndexedSeq(rt.fields(0), rt.fields(1)))
    assert(Region.loadInt(rt.loadField(rv.offset, 1)) == Region.loadInt(view.loadField(rv.offset, 1)))
  }
}
