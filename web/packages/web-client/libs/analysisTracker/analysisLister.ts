// import { initIdTokenHandler, addCallback as addAuthCallback, loggedInEventName, loggedOutEventName } from "../auth"
import Callbacks from "../callbacks";

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
const available = [
  {
    name: "Bystro Annotation",
    description: "Annotate and index for search",
    author: "Alex Kotlar",
    authorUrl: "https://github.com/akotlar/bystro",
    githubLink: "https://github.com/akotlar/bystro",
    dockerUrl: "https://dockerhub.com/whatever",
    id: "0",
    type: "annotation",
    citations: ["Nature", "Cell", "Blah"],
    compatibleWith: {
      4: true,
      3: true
    },
    input_order: ["assembly", "inputFile"],
    event_stages: [],

    progress: {},
    distribution_type: "map",
    inputs: {
      assembly: {
        type_category: "assembly",
        species: ["Human"],
        assemblies: {
          Human: [
            {
              name: "hg19",
              value: "hg19"
            },
            {
              name: "hg38",
              value: "hg38"
            }
          ]
        },
        value: null,
        type: "assembly",
        category: "value"
      },
      inputFile: {
        name: "My cool file",
        schema: { version: 4 },
        // value, or a symlink which other tasks this comes from
        // or array of values
        // We expect that if an array is provided, it will be the same length for all inputs
        value: null,
        title: "Upload to Submit",
        type_category: "file",
        compressed_extensions_accepted: ["gz", "bgz"],
        accepts_stdin: true,
        description: `Accepts <a href='http://vcf.com' target='_blank'>VCF</a>`,
        type: "vcf",
        category: "value",
        accepts_multiple: true
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
        name: "Bystro Annotation",
        basename: "bystro_output",
        dir: "/Users/alex/Downloads/bystro_analyze/",
        append_unique_subdir: true,
        value: null,
        type: "bystro",
        schema: { build_version: "1" } // the yaml
      }
    },
    rating: 0.95,
    reviews: [
      { rating: 1, name: "Alex", review: "Great" },
      { rating: 1, name: "Alex", review: "Great" }
    ],
    steps: [{}]
  },
  {
    name: "Hail PCA",
    description: "Computes N principle components in hail",
    author: "Alex Kotlar",
    authorUrl: "https://github.com/akotlar/bystro",
    githubLink: "https://github.com/akotlar/bystro",
    dockerUrl: "https://dockerhub.com/whatever",
    id: "9",
    type: "hail",
    citations: ["Nature", "Cell", "Blah"],
    distribution_type: "map",
    compatibleWith: {
      4: true,
      3: true
    },
    input_order: ["inputFile"],
    event_stages: [],

    intermediate_outputs: {},
    progress: {},
    inputs: {
      inputFile: {
        schema: { FORMAT: { GT: 1 } },
        // value, or a symlink which other tasks this comes from
        // or array of values
        // We expect that if an array is provided, it will be the same length for all inputs
        value: null,
        title: "Upload to Submit",
        type_category: "file",
        compressed_extensions: ["gz", "bgz"],
        accept_stdin: true,
        description: `Accepts <a href='http://vcf.com' target='_blank'>VCF</a>`,
        type: "vcf",
        category: "file"
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
    output_directory: "./data",
    outputs: {
      outputFile: {
        name: "Bystro Annotation",
        basename: "bystro_output",
        dir: "/Users/alex/Downloads/bystro_analyze/",
        extension: ".annotation.tsv.gz",
        append_unique_subdir: true,
        value: null,
        type: "bystro",
        schema: {}
      }
    },
    rating: 0.95,
    reviews: [
      { rating: 1, name: "Alex", review: "Great" },
      { rating: 1, name: "Alex", review: "Great" }
    ],
    steps: [{}]
  },
  {
    name: "1000G Phase3 100K variants",
    description: "First 100K variants from 1000G",
    author: "Alex Kotlar",
    authorUrl: "https://github.com/akotlar/bystro",
    githubLink: "https://github.com/akotlar/bystro",
    dockerUrl: "https://dockerhub.com/whatever",
    id: "8",
    type: "resource",
    citations: [],
    distribution_type: "map",
    outputs: {
      "ALL.chr1.phase3_shapeit2_mvncall_integrated_v5a.20130502.genotypes.100Klines_rand.vcf.gz": {
        name: "Gnomad Exomes Chr1",
        schema: { FORMAT: { GT: 1 } },
        allowed_protocols: { "file://": 1, "s3://": 1, "gs://": 1 },
        // value, or a symlink which other tasks this comes from
        value:
          "https://1000g-vcf.s3.amazonaws.com/ALL.chr1.phase3_shapeit2_mvncall_integrated_v5a.20130502.genotypes.100Klines_rand.vcf.gz",
        type: "vcf",
        category: "file"
      }
    },
    rating: 0.95
  },
  {
    name: "Gnomad Exomes",
    description: "Grabs gnomad.exomes",
    author: "Alex Kotlar",
    authorUrl: "https://github.com/akotlar/bystro",
    githubLink: "https://github.com/akotlar/bystro",
    dockerUrl: "https://dockerhub.com/whatever",
    id: "7",
    type: "resource",
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
    outputs: {
      "gnomad.exomes.r2.1.1.sites.1.vcf.bgz": {
        name: "Gnomad Exomes Chr1",
        schema: { version: "2.11" },
        // value, or a symlink which other tasks this comes from
        value:
          "https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/exomes/gnomad.exomes.r2.1.1.sites.1.vcf.bgz",
        title: null,
        description: `<span>Accepts <a href='http://vcf.com' target='_blank'>VCF</a></span>`,
        type_category: "url",
        type: "vcf",
        category: "file"
      }
    },
    rating: 0.95
  },
  {
    name: "UKBB GWAS",
    description: "Genome-wide association, bonferroni-corrected",
    parameters: [
      {
        name: "alpha"
      }
    ],
    id: "4",
    author: "Tim Poterba",
    type: "hail",
    distribution_type: "map",
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
      "Blah"
    ],
    inputs: {
      inputFile: {
        name: "some input",
        value: null,
        type: "bystro",
        schema: {}
      }
    },
    outputs: {
      outputFile: {
        name: "some output",
        value: null,
        schema: "some_other_schema"
      }
    },
    rating: 0.95,
    reviews: [
      { rating: 1, name: "Alex", review: "Great" },
      { rating: 1, name: "Alex", review: "Great" }
    ]
  },
  {
    name: "PCA (Plink)",
    id: "1",
    type: "hail",
    author: "Dan King",
    citations: ["Nature", "Cell", "Blah"],
    input_stage_idx: 0,
    distribution_type: "map",
    parameters: {},
    inputs: {
      vcf: [
        {
          name: "My cool file",
          value: null,
          schema: { version: 4 },
          type_category: "file"
        }
      ]
    },
    outputs: {
      MatrixTable: [
        {
          name: "some file",
          value: null
        }
      ]
    },
    rating: 0.95,
    reviews: [
      { rating: 1, name: "Alex", review: "Great" },
      { rating: 1, name: "Alex", review: "Great" }
    ]
  },
  {
    name: "VCF To Matrix Table",
    id: "2",
    type: "hail",
    input_stage_idx: 0,
    distribution_type: "map",
    citations: ["Nature", "Cell", "Blah"],
    inputs: {
      MatrixTable: [
        {
          name: "some file",
          value: "/path/to/file"
        }
      ]
    },
    outputs: {
      Table: [
        {
          name: "some file",
          value: "/path/to/file"
        }
      ]
    },
    rating: 0.7
  },
  {
    name: "Bystro To JSON",
    id: "3",
    type: "hail",
    citations: ["Nature", "Cell", "Blah"],
    distribution_type: "map",
    inputs: {
      inputFile: {
        type: "bystro",
        compression_supported: { gz: 1 },
        dir: "/Users/alex/Downloads/bystro_analyze/",
        append_unique_subdir: true,
        value: null,
        schema: { build_version: "1" } // the yaml
      }
    },
    outputs: {
      outputFile: {
        name: "Bystro JSON",
        basename: "bystro_output",
        dir: "/Users/alex/Downloads/bystro_analyze/",
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
  available_by_key[item["id"]] = item;
}

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
