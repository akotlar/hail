import unittest
import hail as hl
from .helpers import *

setUpModule = startTestHailContext
tearDownModule = stopTestHailContext


class Tests(unittest.TestCase):
    def test_init_hail_context_twice(self):
        hl.init(hl.spark_context(), idempotent=True) # Should be no error

    def test_top_level_functions_are_do_not_error(self):
        hl.current_backend()
        hl.debug_info()
