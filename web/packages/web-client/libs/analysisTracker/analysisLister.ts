// import { initIdTokenHandler, addCallback as addAuthCallback, loggedInEventName, loggedOutEventName } from "../auth"
import Callbacks from "../callbacks";
// const uuidv4 = require("uuid/v4");
// Variables:
// %basename

// Input order is automatically generated if not present
// Input/outputs are either strings representing urls, or pointers to another component

// If you supply 10 files to a component that accepts only 1 file
// It will launch 10 jobs
// If that component feeds into a component that accepts 1 file
// it will launch 10 jobs of that component as well, once the current
// node is done.

// Nodes can only be chained by their compatible inputs/outputs
// We cannot statically guarantee success, rely on strong typing
// to specify the programmatic interface

// Every component that exposes parameters is required to have a preview mode
// The preview mode should be a custom dockerfile that has a small subset of data loaded
// Should take seconds to run
// And is required to publish to a "preview" channel
// For the user's id, which is the topic

// Publishing a V1 requires a review process
// Publishing a V2 with modified settings requires no process
// --- we'll need to group together multiple versions
// Publishing a V2 htat has edited source code will incur an expedited review

// Events:
// For each event_stage these will be bound
// const annotation = {
//     submitted: 'submitted',
//     started: 'started',
//     completed: 'completed',
//     failed: 'failed',
//     progress: 'progrss',
//   };
// so for event "annotation", we'll get "annotation-submitted", etc

// Intermediate outputs may be generated, and those will be cached/stored
// so that they can be re-used (or deleted) as needed

// The schema specifi

// Need a query type. This allows indexing arbitrary data into our elasticsearch cluster.

// FOR NOW:
// For file-based non-resource modules, inputFile is the only key. We will relax this later
// with a full spec

// One inputFile per job, but there can be other inputs. and the actual shape of the
// inputFile value can be anything (the worker just needs to know how to consume it)

// Oh, index should be a property. If present will isntruct us to index the resulting data
// WIth the config specified in the index: { config: {} },
// Must be valid elasticsearch, and must specify ES version.
// Then we'll need to know how to route to the appropriate ES instance.

// NEW:

// 1) Each input needs to have an input spec
// 2) There is always an "inputFile". This can have any spec
// An output from a previous job must match the inputSpec exactly
// 3) Besides the "inputFile", there can be any properties
// A previous job must match at least one full input spec in order to be considered compatible.
// An input spec is just the json describing the input, minus the value
// Not sure if will be stored separately, or not.

// 4) For now, only 1 direct dependency on a job.
// 5) If we allow multiple previous deps: if one dep specifies N files that match the input spec, this will create N jobs
// if I then combine that with another dependency, it must have compatible dimensions
// meaning if job_previous1_a has 5 outputs that are compatible (say vcf), job_previous1_b can only have 1
// otherwise we get a combinatorial explosion,
// say I provide 2 assemblies.
// That will create 5*2 jobs, 5 for each file, once for each assembly.
// That doesn't make a ton of sense.

// So for now, only allow the "inputFile" to explode

// AH! When someone provides an "inputSpec", it must contain an "inputFile" key.
// We do a quick check on this to match specs
// Then the "inputFile" key in the inputs: { } property will only contain the value(s) for the input file.

// Outputs are similar. Output specs describe the output (and will not be filled until job completion)
// They have an "outputSpec"
// The outputs: {} key contains at least one "outputFile", which can be 1 or more values

// The outputSpec should not be an array
// The inputSpec will ahve a property "reduce"  which can be true or false

// OH! There is no separate "inputSpec" or "outputSpec", just a "spec" key inside the input/output key's value
// Ex: inputs: {inputFile: { spec: {type: vcf, name: } } }

// We need to know assembly
// 2 categories of assembly: a specific value, or "all"

// We may want to allow hoisting of specs, if they are all common

// After choosing an input file, the assembly needs to be set.
// So really, compatibility isn't just at the input level
// So when you set an assembly, it updates the file.
// Most sensible way is probably to define, that for "type=file" we have to have an assembly

// Schema 'any'

// The directory is automatically set to the directory of the input edge

// output dir should probably be set automatically

// output file name gets set automatically, for now

// TODO: Not sure where to stick assemblies. For new jobs we may have a spec
// that is variable on the assembly only (for instance VCF has some fields, that is the spec)
// but the data may come from GRCh37 or 38.
const available = [
  {
    _id: "test-1",
    jobID: null,
    batchID: null,
    description: {
      title: "Bystro Annotation",
      subtitle: "Annotate and index for search",
      author: "Alex Kotlar",
      authorUrl: "https://github.com/akotlar/bystro",
      githubLink: "https://github.com/akotlar/bystro",
      dockerUrl: "https://dockerhub.com/whatever",
      citations: ["Nature", "Cell", "Blah"],
      rating: 0.95,
      reviews: [
        { rating: 1, name: "Alex", review: "Great" },
        { rating: 1, name: "Alex", review: "Great" }
      ]
    },
    spec: {
      input_order: ["assembly", "inputFile"],
      event_stages: [],
      distribution_type: "map",
      type: "annotation"
    },
    // json schema
    // definitions: {
    //   inputs: {
    //     assembly: {
    //       category: "assembly",
    //       type: "string",
    //       schema: {
    //         species: ["Human"],
    //         assemblies: [
    //           [
    //             {
    //               name: "hg19",
    //               value: "hg19"
    //             },
    //             {
    //               name: "hg38",
    //               value: "hg38"
    //             }
    //           ]
    //         ]
    //       }
    //     }
    //   }
    // },
    submission: {
      state: "not_submitted",
      last_error: "",
      log: {
        progress: 0,
        skipped: 0,
        message: []
      },
      type: "annotation",
      attempts: 0,
      submittedDate: null,
      queueID: null,
      startedDate: null,
      finishedDate: null
    },
    inputs: {
      assembly: {
        spec: {
          category: "assembly",
          type: "string",
          schema: {
            species: ["Human"],
            assemblies: [
              [
                {
                  name: "hg19",
                  value: {
                    value: "hg19",
                    aliases: [
                      {
                        value: "GRCh37"
                      }
                    ]
                  }
                },
                {
                  name: "hg38",
                  value: {
                    value: "hg38",
                    aliases: [
                      {
                        value: "GRCh38"
                      }
                    ]
                  }
                }
              ]
            ]
          }
        },
        description: {
          title: "Choose Genome and Assembly"
        },
        value: null
      },
      inputFile: {
        spec: {
          schema: { version: "2.11", INFO: { AC_EAS: "Int" } },
          category: "vcf",
          type: "file",
          assembly: {
            $ref: "#/inputs/assembly"
          },
          accepted_protocols: ["file://", "s3://", "gs://"],
          compression_accepted: ["gz", "bgz"],
          reduce_multiple: false // means map
        },
        description: {
          title: "Upload to Submit",
          subtitle: `Accepts <a href='http://vcf.com' target='_blank'>VCF</a>`
        },
        // value, or a symlink which other tasks this comes from
        // or array of values
        // We expect that if an array is provided, it will be the same length for all inputs
        value: null
      }
    },
    parameters: {
      minGq: {
        description: "Minimum GQ",
        default: 20,
        range: {
          min: 0,
          max: 100
        },
        collapse: true
      },
      index: {
        description: "Create a search index",
        default: true,
        collpase: true
      },
      filter: {
        description: "Acceptable filter parameters",
        default: "PASS,."
      }
    },
    outputs: {
      outputFile: {
        spec: {
          schema: { build_version: "1" },
          category: "bystro-annotation",
          type: "file",
          compression_scheme: "gz"
        },
        description: {
          name: "Bystro Annotation"
        },
        basename: "%inputs.inputFile.value%",
        dir: "/Users/alex/Downloads/bystro_analyze/",
        append_unique_subdir: true,
        value: null
      }
    }
  },
  {
    _id: "test-2",
    jobID: null,
    batchID: null,
    description: {
      title: "Gnomad Exomes",
      subtitle: "Grabs gnomad.exomes",
      author: "Alex Kotlar",
      authorUrl: "https://github.com/akotlar/bystro",
      githubLink: "https://github.com/akotlar/bystro",
      dockerUrl: "https://dockerhub.com/whatever",
      citations: [
        "Nature",
        "Cell",
        "Blah",
        "Nature",
        "Cell",
        "Blah",
        "Nature",
        "Cell",
        "Blah",
        "Nature",
        "Cell",
        "Blah",
        "Nature",
        "Cell",
        "Blah",
        "Nature",
        "Cell",
        "Blah",
        "Nature",
        "Cell",
        "Blah",
        "Nature",
        "Cell",
        "Blah",
        "Nature",
        "Cell",
        "Blah"
      ],
      rating: 0.95
    },
    spec: {
      type: "resource"
    },
    submission: {
      state: "not_submitted",
      last_error: "",
      log: {
        progress: 0,
        skipped: 0,
        message: []
      },
      type: "batch",
      attempts: 0,
      submittedDate: null,
      queueID: null,
      startedDate: null,
      finishedDate: null
    },
    outputs: {
      "gnomad.exomes.r2.1.1.sites.1.vcf.bgz": {
        name: "Gnomad Exomes Chr1",
        spec: {
          schema: {
            version: "2.11",
            required: true,
            INFO: { AC_EAS: "Int", AC_AFR: "Int" }
          },
          category: "vcf",
          type: "file",
          assembly: {
            value: "GRCh37"
          }
        },
        description: {
          title: "Gnomad Exomes VCF",
          subtitle: `<span>Accepts <a href='http://vcf.com' target='_blank'>VCF</a></span>`
        },

        // value, or a symlink which other tasks this comes from
        value:
          "https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/exomes/gnomad.exomes.r2.1.1.sites.1.vcf.bgz"
      }
    }
  },
  {
    _id: "test-3",
    jobID: null,
    batchID: null,
    description: {
      title: "Gnomad Genomes",
      subtitle: "Grabs gnomad.genomes",
      author: "Alex Kotlar",
      authorUrl: "https://github.com/akotlar/bystro",
      githubLink: "https://github.com/akotlar/bystro",
      dockerUrl: "https://dockerhub.com/whatever",
      citations: [
        "Nature",
        "Cell",
        "Blah",
        "Nature",
        "Cell",
        "Blah",
        "Nature",
        "Cell",
        "Blah",
        "Nature",
        "Cell",
        "Blah",
        "Nature",
        "Cell",
        "Blah",
        "Nature",
        "Cell",
        "Blah",
        "Nature",
        "Cell",
        "Blah",
        "Nature",
        "Cell",
        "Blah",
        "Nature",
        "Cell",
        "Blah"
      ],
      rating: 0.95
    },
    spec: {
      type: "resource"
    },
    submission: {
      state: "not_submitted",
      last_error: "",
      log: {
        progress: 0,
        skipped: 0,
        message: []
      },
      type: "batch",
      attempts: 0,
      submittedDate: null,
      queueID: null,
      startedDate: null,
      finishedDate: null
    },
    outputs: {
      "gnomad.exomes.r2.1.1.sites.1.vcf.bgz": {
        name: "Gnomad Exomes Chr1",
        spec: {
          schema: { version: "2.11" },
          title: null,
          description: `<span>Accepts <a href='http://vcf.com' target='_blank'>VCF</a></span>`,
          category: "vcf",
          type: "file",
          assembly: ["hg19", "GRCh37"]
        },

        // value, or a symlink which other tasks this comes from
        value:
          "https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/exomes/gnomad.exomes.r2.1.1.sites.1.vcf.bgz"
      }
    }
  },
  {
    _id: "test-4",
    jobID: null,
    batchID: null,
    // type: "hail",
    description: {
      title: "Bystro To JSON",
      subtitle: "Do stuff",
      citations: ["Nature", "Cell", "Blah"]
    },
    spec: {
      distribution_type: "map",
      type: "batch"
    },
    submission: {
      state: "not_submitted",
      last_error: "",
      log: {
        progress: 0,
        skipped: 0,
        message: []
      },
      type: "batch",
      attempts: 0,
      submittedDate: null,
      queueID: null,
      startedDate: null,
      finishedDate: null
    },
    inputs: {
      inputFile: {
        spec: {
          schema: "any",
          category: "bystro-annotation",
          type: "file",
          accepted_protocols: ["file://", "s3://", "gs://"],
          compression_accepted: ["gz", "bgz"]
        },
        description: {
          title: "Bystro -> JSON",
          subtitle: `Accepts <a href='http://vcf.com' target='_blank'>Bystro file</a>`
        },
        dir: null,
        append_unique_subdir: true,
        value: null
      }
    },
    outputs: {
      outputFile: {
        spec: {
          schema: "any",
          category: "bystro-annotation",
          type: "file",
          accepted_protocols: ["file://", "s3://", "gs://"],
          compression_accepted: ["gz", "bgz"]
        },
        basename: "bystro_output",
        dir: null,
        append_unique_subdir: true,
        value: null,
        type: "bystro",
        schema: {} //all fields
      }
    },
    rating: 0.6
  },
  {
    _id: "test-5",
    jobID: null,
    batchID: null,
    // type: "hail",
    description: {
      title: "Hail QC Pipeline",
      subtitle: "Takes JSON or MT, performs QC",
      citations: ["Nature", "Cell", "Blah", "Nature", "Cell", "Blah"]
    },
    spec: {
      distribution_type: "map",
      type: "schemaless-transform"
    },
    submission: {
      state: "not_submitted",
      last_error: "",
      log: {
        progress: 0,
        skipped: 0,
        message: []
      },
      type: "batch",
      attempts: 0,
      submittedDate: null,
      queueID: null,
      startedDate: null,
      finishedDate: null
    },
    inputs: {
      inputFile: {
        spec: {
          schema: {},
          category: "bystro-annotation",
          type: "file",
          accepted_protocols: ["file://", "s3://", "gs://"],
          accepted_formats: ["json", "mt", "vcf"],
          compression_accepted: ["gz", "bgz"]
        },
        description: {
          title: "Upload to Go!",
          subtitle: `Accepts <a href='http://vcf.com' target='_blank'>Bystro file</a>`
        },
        dir: null,
        append_unique_subdir: true,
        value: null
      }
    },
    outputs: {
      outputFile: {
        spec: {
          schema: "any",
          category: "bystro-annotation",
          type: "file",
          accepted_protocols: ["file://", "s3://", "gs://"],
          compression_accepted: ["gz", "bgz"]
        },
        basename: "bystro_output",
        dir: null,
        append_unique_subdir: true,
        value: null,
        type: "bystro",
        schema: {} //all fields
      }
    },
    rating: 0.6
  }
];

const available_by_key = {};
for (const item of available) {
  available_by_key[item._id] = item;
}

console.info(available_by_key);

export const events = {
  analyses: "analyses"
};

const callbacks = new Callbacks({});

export function addCallback(
  type: string,
  action: (data: {}) => void,
  triggerOnAddition: boolean = true
): number {
  const id = callbacks.add(type, action);

  console.info(`${type} callback called`);

  if (triggerOnAddition) {
    console.info("submitting", available_by_key);
    action(available_by_key);
  }

  return id;
}

export const removeCallback = callbacks.remove;

export default {
  get analyses() {
    return available_by_key;
  },
  get analysesArray() {
    return available;
  }
};

//   {
//     name: "Hail PCA",
//     description: "Computes N principle components in hail",
//     author: "Alex Kotlar",
//     authorUrl: "https://github.com/akotlar/bystro",
//     githubLink: "https://github.com/akotlar/bystro",
//     dockerUrl: "https://dockerhub.com/whatever",
//     id: "9",
//     type: "hail",
//     citations: ["Nature", "Cell", "Blah"],
//     distribution_type: "map",
//     compatibleWith: {
//       4: true,
//       3: true
//     },
//     input_order: ["inputFile"],
//     event_stages: [],

//     intermediate_outputs: {},
//     progress: {},
//     inputs: {
//       inputFile: {
//         schema: { FORMAT: { GT: 1 } },
//         // value, or a symlink which other tasks this comes from
//         // or array of values
//         // We expect that if an array is provided, it will be the same length for all inputs
//         value: null,
//         title: "Upload to Submit",
//         type_category: "file",
//         compressed_extensions: ["gz", "bgz"],
//         accept_stdin: true,
//         description: `Accepts <a href='http://vcf.com' target='_blank'>VCF</a>`,
//         type: "vcf",
//         category: "file"
//       }
//     },
//     parameters: {
//       minGq: {
//         description: "Minimum GQ",
//         default: 20,
//         range: {
//           min: 0,
//           max: 100
//         },
//         collapse: true
//       },
//       index: {
//         description: "Create a search index",
//         default: true,
//         collpase: true
//       },
//       filter: {
//         description: "Acceptable filter parameters",
//         default: "PASS,."
//       }
//     },
//     output_directory: "./data",
//     outputs: {
//       outputFile: {
//         name: "Bystro Annotation",
//         basename: "bystro_output",
//         dir: "/Users/alex/Downloads/bystro_analyze/",
//         extension: ".annotation.tsv.gz",
//         append_unique_subdir: true,
//         value: null,
//         type: "bystro",
//         schema: {}
//       }
//     },
//     rating: 0.95,
//     reviews: [
//       { rating: 1, name: "Alex", review: "Great" },
//       { rating: 1, name: "Alex", review: "Great" }
//     ],
//     steps: [{}]
//   },
//   {
//     name: "1000G Phase3 100K variants",
//     description: "First 100K variants from 1000G",
//     author: "Alex Kotlar",
//     authorUrl: "https://github.com/akotlar/bystro",
//     githubLink: "https://github.com/akotlar/bystro",
//     dockerUrl: "https://dockerhub.com/whatever",
//     id: "8",
//     type: "resource",
//     citations: [],
//     distribution_type: "map",
//     outputs: {
//       "ALL.chr1.phase3_shapeit2_mvncall_integrated_v5a.20130502.genotypes.100Klines_rand.vcf.gz": {
//         name: "Gnomad Exomes Chr1",
//         schema: { FORMAT: { GT: 1 } },
//         allowed_protocols: { "file://": 1, "s3://": 1, "gs://": 1 },
//         // value, or a symlink which other tasks this comes from
//         value:
//           "https://1000g-vcf.s3.amazonaws.com/ALL.chr1.phase3_shapeit2_mvncall_integrated_v5a.20130502.genotypes.100Klines_rand.vcf.gz",
//         type: "vcf",
//         category: "file"
//       }
//     },
//     rating: 0.95
//   },
//   {
//     name: "Gnomad Exomes",
//     description: "Grabs gnomad.exomes",
//     author: "Alex Kotlar",
//     authorUrl: "https://github.com/akotlar/bystro",
//     githubLink: "https://github.com/akotlar/bystro",
//     dockerUrl: "https://dockerhub.com/whatever",
//     id: "7",
//     type: "resource",
//     citations: [
//       "Nature",
//       "Cell",
//       "Blah",
//       "Nature",
//       "Cell",
//       "Blah",
//       "Nature",
//       "Cell",
//       "Blah",
//       "Nature",
//       "Cell",
//       "Blah",
//       "Nature",
//       "Cell",
//       "Blah",
//       "Nature",
//       "Cell",
//       "Blah",
//       "Nature",
//       "Cell",
//       "Blah",
//       "Nature",
//       "Cell",
//       "Blah",
//       "Nature",
//       "Cell",
//       "Blah"
//     ],
//     outputs: {
//       "gnomad.exomes.r2.1.1.sites.1.vcf.bgz": {
//         name: "Gnomad Exomes Chr1",
//         schema: { version: "2.11" },
//         // value, or a symlink which other tasks this comes from
//         value:
//           "https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/exomes/gnomad.exomes.r2.1.1.sites.1.vcf.bgz",
//         title: null,
//         description: `<span>Accepts <a href='http://vcf.com' target='_blank'>VCF</a></span>`,
//         type_category: "url",
//         type: "vcf",
//         category: "file"
//       }
//     },
//     rating: 0.95
//   },
//   {
//     name: "UKBB GWAS",
//     description: "Genome-wide association, bonferroni-corrected",
//     parameters: [
//       {
//         name: "alpha"
//       }
//     ],
//     id: "4",
//     author: "Tim Poterba",
//     type: "hail",
//     distribution_type: "map",
//     citations: [
//       "Nature",
//       "Cell",
//       "Blah",
//       "Nature",
//       "Cell",
//       "Blah",
//       "Nature",
//       "Cell",
//       "Blah",
//       "Nature",
//       "Cell",
//       "Blah",
//       "Nature",
//       "Cell",
//       "Blah",
//       "Nature",
//       "Cell",
//       "Blah",
//       "Nature",
//       "Cell",
//       "Blah",
//       "Nature",
//       "Cell",
//       "Blah"
//     ],
//     inputs: {
//       inputFile: {
//         name: "some input",
//         value: null,
//         type: "bystro",
//         schema: {}
//       }
//     },
//     outputs: {
//       outputFile: {
//         name: "some output",
//         value: null,
//         schema: "some_other_schema"
//       }
//     },
//     rating: 0.95,
//     reviews: [
//       { rating: 1, name: "Alex", review: "Great" },
//       { rating: 1, name: "Alex", review: "Great" }
//     ]
//   },
//   {
//     name: "PCA (Plink)",
//     id: "1",
//     type: "hail",
//     author: "Dan King",
//     citations: ["Nature", "Cell", "Blah"],
//     input_stage_idx: 0,
//     distribution_type: "map",
//     parameters: {},
//     inputs: {
//       vcf: [
//         {
//           name: "My cool file",
//           value: null,
//           schema: { version: 4 },
//           type_category: "file"
//         }
//       ]
//     },
//     outputs: {
//       MatrixTable: [
//         {
//           name: "some file",
//           value: null
//         }
//       ]
//     },
//     rating: 0.95,
//     reviews: [
//       { rating: 1, name: "Alex", review: "Great" },
//       { rating: 1, name: "Alex", review: "Great" }
//     ]
//   },
//   {
//     name: "VCF To Matrix Table",
//     id: "2",
//     type: "hail",
//     input_stage_idx: 0,
//     distribution_type: "map",
//     citations: ["Nature", "Cell", "Blah"],
//     inputs: {
//       MatrixTable: [
//         {
//           name: "some file",
//           value: "/path/to/file"
//         }
//       ]
//     },
//     outputs: {
//       Table: [
//         {
//           name: "some file",
//           value: "/path/to/file"
//         }
//       ]
//     },
//     rating: 0.7
//   },
//   {
//     name: "Bystro To JSON",
//     id: "3",
//     type: "hail",
//     citations: ["Nature", "Cell", "Blah"],
//     distribution_type: "map",
//     inputs: {
//       inputFile: {
//         type: "bystro",
//         compression_supported: { gz: 1 },
//         dir: "/Users/alex/Downloads/bystro_analyze/",
//         append_unique_subdir: true,
//         value: null,
//         schema: { build_version: "1" } // the yaml
//       }
//     },
//     outputs: {
//       outputFile: {
//         name: "Bystro JSON",
//         basename: "bystro_output",
//         dir: "/Users/alex/Downloads/bystro_analyze/",
//         append_unique_subdir: true,
//         value: null,
//         type: "bystro",
//         schema: {} //all fields
//       }
//     },
//     rating: 0.6
//   }
