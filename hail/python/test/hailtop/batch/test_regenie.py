import unittest
import hailtop.batch.genetics.regenie as br
import os

cwd = os.getcwd()
rdir = "hailtop/batch/genetics/regenie"


def read(file):
    with open(file, 'r') as f:
        return f.read()


def assert_same_file(file1, file2):
    assert read(file1) == read(file2)


class LocalTests(unittest.TestCase):
    def test_regenie(self):
        os.chdir(rdir)
        out_prefix = "batch"
        args = br.parse_input_args(["--demo", "--out", out_prefix])
        br.run(args)

        out_log = f"{out_prefix}.log"
        out1 = f"{out_prefix}.test_bin_out_firth_Y1.regenie"
        out2 = f"{out_prefix}.test_bin_out_firth_Y2.regenie"
        expected = "regenie/example/example.test_bin_out_firth_Y1.regenie"

        assert len(read(out_log)) > 0
        assert_same_file(out1, expected)
        assert len(read(out2)) > 0

        os.remove(out_log)
        os.remove(out1)
        os.remove(out2)

        os.chdir(cwd)

    def test_regenie_1pheno(self):
        os.chdir(rdir)
        out_prefix = "batch"
        args = br.parse_input_args(["--local", "--step1", "example/step1.txt", "--step2",
                                    "example/step2-phenoCol.txt", "--out", out_prefix])
        br.run(args)

        out_log = f"{out_prefix}.log"
        out1 = f"{out_prefix}.test_bin_out_firth_Y1.regenie"
        out2 = f"{out_prefix}.test_bin_out_firth_Y2.regenie"
        expected = "regenie/example/example.test_bin_out_firth_Y1.regenie"

        assert_same_file(out1, expected)
        assert not os.path.isfile(out2)

        os.remove(out_log)
        os.remove(out1)

        args = br.parse_input_args(["--local", "--step1", "example/step1.txt", "--step2",
                                    "example/step2-phenoColList.txt", "--out", out_prefix])
        br.run(args)

        assert len(read(out2)) > 0
        assert not os.path.isfile(out1)

        os.remove(out_log)
        os.remove(out2)

        os.chdir(cwd)
