
// import { initIdTokenHandler, addCallback as addAuthCallback, loggedInEventName, loggedOutEventName } from "../auth"
import Callbacks from "../callbacks";


const available = [
    {
        name: "Bystro Annotation",
        description: "Annotate and index for search",
        author: "Alex Kotlar",
        authorUrl: "https://github.com/akotlar/bystro",
        githubLink: "https://github.com/akotlar/bystro",
        dockerUrl: "https://dockerhub.com/whatever",
        id: "0",
        type: 'bystro',
        citations: ["Nature", "Cell", "Blah"],
        compatibleWith: {
            4: true,
            3: true
        },
        inputs: {
            assembly: {
                type_category: 'assembly',
                species: [
                    "Human"
                ],
                assemblies: {
                    Human: [{
                        name: 'hg19',
                        value: 'hg19',
                    }, {
                        name: 'hg38',
                        value: 'hg38',
                    }]
                },
                value: null
            },
            vcf: [{
                name: "My cool file",
                schema: { version: 4 },
                // value, or a symlink which other tasks this comes from
                value: null,
                title: "Upload to Submit",
                description: "N files for N submissions",
                type_category: 'file',
                accepted_extensions: ['vcf', 'snp'],
                accepted_compression: ['gz'],
                accepted_descriptions: ['a vcf file', 'a snp file'],
                accepted_links: ['http://vcf.com', 'http://snp.com']
            }],
        },
        parameters: {
            minGq: {
                description: "Minimum GQ",
                default: 20,
                range: {
                    min: 0,
                    max: 100
                },
                collapse: true,
            },
            index: {
                description: "Create a search index",
                default: true,
                collpase: true,
            },
            filter: {
                description: "Acceptable filter parameters",
                default: "PASS,."
            },
        },
        outputs: {
            bystro: [{
                name: "%basename%.annotation.tsv",
                path: "",
                schema: "bystro_config_file.yml"
            }]
        },
        rating: 0.95,
        reviews: [{ rating: 1, name: "Alex", review: "Great" }, { rating: 1, name: "Alex", review: "Great" }],
        steps: [{

        }]
    },
    {
        "name": "UKBB GWAS",
        description: "Genome-wide association, bonferroni-corrected",
        parameters: [{
            name: "alpha",
        }],
        id: "4",
        author: "Tim Poterba",
        type: 'hail',
        citations: ["Nature", "Cell", "Blah", "Nature", "Cell", "Blah", "Nature", "Cell", "Blah", "Nature", "Cell", "Blah", "Nature", "Cell", "Blah", "Nature", "Cell", "Blah", "Nature", "Cell", "Blah", "Nature", "Cell", "Blah"],
        inputs: {
            "bystro": [{
                name: "some file",
                path: "/path/to/file",
                schema: "bystro_config_file.yml"
            }]
        },
        outputs: {
            "tsv": [{
                name: "some file",
                path: "/bystro/user-data/output_bystro_1",
                schema: "some_other_schema"
            }]
        },
        rating: 0.95,
        reviews: [{ rating: 1, name: "Alex", review: "Great" }, { rating: 1, name: "Alex", review: "Great" }]
    },
    {
        name: "PCA (Plink)",
        id: "1",
        type: 'hail',
        author: "Dan King",
        citations: ["Nature", "Cell", "Blah"],
        inputs: {
            "vcf": [{
                name: "My cool file",
                path: "/path/to/file",
                schema: { version: 4 }
            }],
        },
        "outputs": {
            "MatrixTable": [{
                name: "some file",
                path: "/path/to/file"
            }]
        },
        rating: 0.95,
        reviews: [{ rating: 1, name: "Alex", review: "Great" }, { rating: 1, name: "Alex", review: "Great" }]

    },
    {
        "name": "VCF To Matrix Table",
        id: "2",
        type: 'hail',
        citations: ["Nature", "Cell", "Blah"],
        inputs: {
            "MatrixTable": [{
                name: "some file",
                path: "/path/to/file"
            }]
        },
        "outputs":
        {
            "Table": [{
                name: "some file",
                path: "/path/to/file"
            }],
        },
        rating: 0.7,

    },
    {
        name: "Bystro To Matrix Table",
        id: "3",
        type: 'hail',
        citations: ["Nature", "Cell", "Blah"],
        inputs: {
            "Table": [{
                name: "some file",
                path: "/path/to/file"
            }]
        },
        "outputs":
        {
            "MatrixTable": [{
                name: "some file",
                path: "/path/to/file"
            }],
        }
        , rating: 0.6,

    },
];

const available_by_key = {};
for (const item of available) {
    available_by_key[item['id']] = item;
}

export const events = {
    analyses: 'analyses',
}

const callbacks = new Callbacks({});

export function addCallback(type: string, action: (data: {}) => void, triggerOnAddition: boolean = true): number {
    const id = callbacks.add(type, action);

    if (triggerOnAddition) {
        console.info("submitting", available_by_key);
        action(available_by_key);
    }

    return id;
};

export const removeCallback = callbacks.remove;

export default {
    get analyses() {
        return available_by_key;
    },
    get analysesArray() {
        return available;
    },
};