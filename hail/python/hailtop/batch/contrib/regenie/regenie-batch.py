import hailtop.batch as hb
from yaml import load, dump
import argparse
import math
from hail.utils import hadoop_open as hopen
from hail.utils import hadoop_exists as hexists
from collections import namedtuple

# TODO: force local_ssd, need to validate against mem
BatchArgs = namedtuple("BatchArgs", ['cores', 'memory', 'storage'])
input_file_args = ["bgen", "bed", "pgen", "sample", "keep", "extract", "exclude", "remove",
                   "phenoFile", "covarFile"]

from_underscore = {
    "force_impute": "force-impute",
    "ignore_pred": "ignore-pred",
    "lowmem_prefix": "lowmem-prefix"
}


def read_args(path_or_str):
    import shlex
    parser = argparse.ArgumentParser()

    parser.add_argument('--step', required=False)
    parser.add_argument('--phenoFile', required=True)

    parser.add_argument('--phenoCol', required=False)
    parser.add_argument('--phenoColList', required=False)

    parser.add_argument('--bed', required=False)
    parser.add_argument('--bgen', required=False)
    parser.add_argument('--pgen', required=False)
    parser.add_argument('--sample', required=False)
    parser.add_argument('--extract', required=False)
    parser.add_argument('--exclude', required=False)
    parser.add_argument('--covarFile', required=False)
    parser.add_argument('--covarCol', required=False)
    parser.add_argument('--covarColList', required=False)
    parser.add_argument('--pThresh', required=False)
    parser.add_argument('--pred', required=False)
    parser.add_argument('--remove', required=False)
    parser.add_argument('--bsize', required=False)
    parser.add_argument('--cv', required=False)
    parser.add_argument('--nb', required=False)
    parser.add_argument('--out', required=False)

    parser.add_argument('--loocv', required=False, action='store_true')
    parser.add_argument('--force-impute', required=False, action='store_true')
    parser.add_argument('--bt', required=False, action='store_true')
    parser.add_argument('--1', '--cc12', required=False, action='store_true')
    parser.add_argument('--split', required=False, action='store_true')
    parser.add_argument('--strict', required=False, action='store_true')
    parser.add_argument('--ignore-pred', required=False, action='store_true')
    parser.add_argument('--firth', required=False, action='store_true')
    parser.add_argument('--approx', required=False, action='store_true')
    parser.add_argument('--spa', required=False, action='store_true')
    parser.add_argument('--debug', required=False, action='store_true')
    parser.add_argument('--verbose', required=False, action='store_true')
    parser.add_argument('--lowmem', required=False, action='store_true')

    parser.add_argument('--lowmem-prefix', required=False)
    parser.add_argument('--threads', required=False, default=1)

    if not hexists(path_or_str):
        print(f"Couldn't find a file named {path_or_str}, assuming this is an argument string")
        r = parser.parse_args(shlex.split(path_or_str))

    else:
        print(f"Found {path_or_str}, reading")

        with hopen(path_or_str, "r") as f:
            t = shlex.split(f.read())
            r = parser.parse_args(t)

    ninputs = sum(i is not None for i in [r.bed, r.bgen, r.pgen])
    if ninputs == 0:
        raise Exception("An input file is required. Please specify: --bed or --bgen or --pgen")

    if ninputs > 1:
        raise Exception(f"""More than one input file specified.
                            Check that only one of --bed or --bgen or --pgen are specified for --step {r.step}
                        """)

    if r.step == 2:
        if r.pred:
            print("--pred provided for --step 2, but Batch will constrain the --pred output prefix to that of --step 1.")

        if r.extract or r.exclude:
            raise Exception("--extract and --exclude only work with --step 1")

    if r.lowmem and not r.lowmem_prefix:
        raise Exception("When --lowmem provided, --lowmem-prefix required")

    return r


# TODO: check --phenoCol, --phenoColList, --remove
def get_phenos(step_args: argparse.Namespace):
    with hopen(step_args.phenoFile, "r") as f:
        return f.readline().strip().split(" ")[2:]


def get_input(batch, step_args: argparse.Namespace):
    add = {}
    for name, val in vars(step_args).items():
        if name in from_underscore:
            name = from_underscore[name]

        if name not in input_file_args or val is None:
            continue

        if name == "bed":
            prefix = step_args.bed
            inf = {}
            inf["bed"] = f"{prefix}.bed"
            inf["bim"] = f'{prefix}.bim'
            inf["fam"] = f'{prefix}.fam'
            add[name] = batch.read_input_group(**inf)
            continue

        if name == "pgen":
            prefix = step_args.pgen
            inf = {}
            inf["pgen"] = f'{prefix}.pgen'
            inf["pvar"] = f'{prefix}.pvar'
            inf["psam"] = f'{prefix}.psam'
            add[name] = batch.read_input_group(**inf)
            continue

        add[name] = batch.read_input(val)

    return add


def regenie(batch, args: BatchArgs, step1_args: argparse.Namespace, step2_args: argparse.Namespace):
    j1 = batch.new_job(name='run-regenie')
    j1.image('akotlar/regenie:latest')
    j1.cpu(args.cores)
    j1.memory(args.memory)
    j1.storage(args.storage)

    in_step1 = get_input(batch, step1_args)

    phenos = get_phenos(step1_args)
    nphenos = len(phenos)

    s1pre = step1_args.out
    s1out = {"log": f"{s1pre}.log", "pred_list": f"{s1pre}_pred.list"}

    for i in range(1, nphenos + 1):
        s1out[f"{s1pre}_{i}"] = f"{s1pre}_{i}.loco"

    if step1_args.lowmem:
        for i in range(1, nphenos + 1):
            pfile = f"{step1_args.lowmem_prefix}_l0_Y{i}"
            s1out[pfile] = pfile

    j1.declare_resource_group(**{s1pre: s1out})

    cmd1 = ""
    for name, val in vars(step1_args).items():
        if val is None or val is False:
            continue

        if name in from_underscore:
            name = from_underscore[name]

        # pred is not used in step 1 according to documentation
        if name == "step" or name == "pred":
            continue

        if name in input_file_args:
            cmd1 += f" --{name} {in_step1[name]}"
            continue

        if name == "out":
            cmd1 += f" --{name} {j1[s1pre]}"
            continue

        if isinstance(val, bool):
            cmd1 += f" --{name}"
            continue

        cmd1 += f" --{name} \"{val}\""

    cmd1 = f"--step 1{cmd1}"

    j1.command(f"regenie {cmd1}")

    phenos = get_phenos(step2_args)
    nphenos = len(phenos)

    j2 = batch.new_job(name='run-regenie')
    j2.image('akotlar/regenie:latest')
    j2.cpu(args.cores)
    j2.memory(args.memory)
    j2.storage(args.storage)

    s2pre = step2_args.out
    s2out = {"log": f"{s2pre}.log"}

    if step2_args.split:
        for pheno in phenos:
            pre = f"{s2pre}_{pheno}"
            s2out[f"{pre}"] = f"{pre}.regenie"

    j2.declare_resource_group(**{s2pre: s2out})

    in_step2 = get_input(batch, step2_args)

    cmd2 = ""
    for name, val in vars(step2_args).items():
        if val is None or val is False:
            continue

        if name in from_underscore:
            name = from_underscore[name]

        if name == "step" or name == "pred":
            continue

        if name in input_file_args:
            cmd2 += f" --{name} {in_step2[name]}"
            continue

        if name == "out":
            cmd2 += f" --{name} {j2[s2pre]}"
            continue

        if isinstance(val, bool):
            cmd2 += f" --{name}"
            continue

        cmd2 += f" --{name} \"{val}\""

    if not step2_args.ignore_pred:
        cmd2 += f" --pred {j1[s1pre]['pred_list']}"

    cmd2 = f"--step 2{cmd2}"

    j2.command(f"regenie {cmd2}")

    return j1, j2, s2pre


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--local', required=False, action="store_true")
    parser.add_argument('--demo', required=False, action="store_true")
    parser.add_argument('--out', required=True)
    parser.add_argument('--cores', required=False, default=2)
    parser.add_argument('--memory', required=False, default="7Gi")
    parser.add_argument('--storage', required=False, default="1Gi")
    parser.add_argument('--step1', required=False)
    parser.add_argument('--step2', required=False)

    args = parser.parse_args()

    is_local = True if args.local or args.demo else False

    if is_local:
        backend = hb.LocalBackend()
        run_opts = {}
    else:
        backend = hb.ServiceBackend()
        run_opts = {"open": True, "wait": True}

    if args.demo:
        step1_args = read_args("example/step1.txt")
        step2_args = read_args("example/step2.txt")
    else:
        if not(args.step1 and args.step2):
            raise Exception("When --demo not provided, --step1 and --step2 must be")

        step1_args = read_args(args.step1)
        step2_args = read_args(args.step2)

    batch_args = BatchArgs(cores=args.cores, memory=args.memory, storage=args.storage)

    batch = hb.Batch(backend=backend, name='regenie')

    j1, j2, s2pre = regenie(batch, batch_args, step1_args, step2_args)

    # FIXME: this will never write to an output directory
    batch.write_output(j2[s2pre], args.out)
    batch.run(**run_opts)

    if not is_local:
        backend.close()