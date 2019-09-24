import { PureComponent, Fragment } from "react";
import data, { addCallback, removeCallback, events } from "../../libs/analysisTracker/analysisLister";
import "styles/card.scss";
import "styles/pages/public.scss";
import "styles/pages/share/item.scss"
import GenomeSelector from '../../components/GenomeSelector/GenomeSelector';

import Router, { withRouter } from 'next/router';

type easy = {
    id: string,
    name: string,
    steps: [],
    inputs: [],
    parameters: [],
    outputs: [],
    rating: number,
    reviews: [],
}
declare type state = {
    jobSelected: {};
    jobSelectedEasy?: easy;
    expanded: boolean;
    inputStageIdx: number;
    speciesChosen?: string,
    assemblyChosen?: string
};

const getItems = (job: {}): {} => {
    console.info('job', job);
    const inputs = [];

    Object.keys(job['inputs']).forEach(key => {
        let input = job['inputs'][key];
        const baseItem = { type: key };

        if (Array.isArray(input)) {
            job['inputs'][key].forEach(entry => {
                inputs.push(Object.assign({}, baseItem, entry));
            })

            return;
        }

        inputs.push(Object.assign({}, baseItem, input))
    });

    const parameters = Object.keys(job['parameters']).map(key => {
        const obj = Object.assign({ name: key }, job['parameters'][key]);

        return obj;
    });

    const outputs = Object.keys(job['outputs']).map(key => {
        const obj = Object.assign({ type: key }, job['outputs'][key]);

        return obj;
    });

    return Object.assign({}, job, {
        inputs,
        parameters,
        outputs,
    });
}

class Item extends PureComponent {
    state: state = {
        jobSelected: {},
        jobSelectedEasy: null,
        expanded: false,
        inputStageIdx: 0,
    };

    _callbackId?: number = null;

    fuse?: any = null

    jobType = 'completed'

    static async getInitialProps({ query }: any) {
        return {
            id: query.id
        };
    }

    constructor(props: any) {
        super(props);

        // this.state.jobSelected = data.analyses[props.id];
    }

    set = (data, id) => {
        if (!data) {
            console.info("Loding");
            return;
        }

        console.info('id', id, this.props);
        const job = data[id];

        if (!job) {
            console.error("Couldn't find the job");
            return;
        }

        const easyVersion = getItems(job);

        this.setState(() => ({
            jobSelected: job,
            jobSelectedEasy: easyVersion,
        }));
    }

    componentDidMount() {
        this._callbackId = addCallback(events.analyses, (data) => this.set(data, (this.props as any).router.query.id));
    }


    componentWillUnmount() {
        removeCallback(events.analyses, this._callbackId);
    }

    componentDidUpdate(prevProps) {
        const { query } = (this.props as any).router
        // verify props have changed to avoid an infinite loop
        if (query.id !== prevProps.router.query.id) {
            this.set(data.analyses, query.id);
        }

        if (query.input_idx !== prevProps.router.query.input_idx) {
            if (this.state.inputStageIdx !== query.input_idx) {
                this.setState(() => ({
                    inputStageIdx: query.input_idx || 0,
                }));
            }

        }
    }

    handleInputSelected(inputKey: number, value: string, inputKeyIdx?: number) {
        this.setState(({ inputStageIdx, jobSelectedEasy }: state) => {
            if (inputKeyIdx != null) {
                (jobSelectedEasy['inputs'][inputKey][inputKeyIdx]['value'] as any) = value
            } else {
                (jobSelectedEasy['inputs'][inputKey]['value'] as any) = value
            }

            const { query } = (this.props as any).router;

            Router.push(`/share/item?id=${query.id}&input_idx=${inputStageIdx + 1}`, `/share/item?id=${query.id}&input_idx=${inputStageIdx + 1}`, { shallow: true })

            return ({
                inputStageIdx: inputStageIdx + 1,
                jobSelectedEasy,
            })
        });

        // console.info('state', this.state);
    }

    addPath = () => {
        alert("clicked");
    }
    //     <md-card-icon-actions layout-align="end center" class="layout-align-end-center">
    //     <span aria-label="Annotation details" md-labeled-by-tooltip="md-tooltip-191">
    //       <button class="md-icon-button md-button md-ink-ripple" type="button" ng-transclude="" ng-click="showMore = !showMore">
    //         <md-icon class="material-icons ng-binding ng-scope" role="img" aria-label="{{!showMore ? 'expand_more' : 'expand_less'}}">
    //           expand_more
    //         </md-icon>
    //       <div class="md-ripple-container"></div></button>

    //     </span>
    //   </md-card-icon-actions>
    render() {
        return (
            <div id='anayses-item-page' className='centered'>

                {!this.state.jobSelectedEasy ? <div>Loading</div> :
                    <Fragment>
                        <div className='row' style={{ marginBottom: 30, marginTop: -150, display: 'flex', padding: 3 }}>

                            <div className='column' >
                                <h2>{this.state.jobSelectedEasy['name']}</h2>
                                <div className='subheader'>
                                    {this.state.jobSelectedEasy['description']}
                                </div>
                                <span style={{ display: this.state.expanded ? "initial" : "none" }}>

                                    <div className='subheader'>
                                        By <a href={this.state.jobSelectedEasy['authorGithubLink']}><b>{this.state.jobSelectedEasy['author']}</b></a>
                                    </div>
                                    <div className='subheader'>
                                        <a href={this.state.jobSelectedEasy['githubLink']}><b>Project Github Link</b></a>
                                    </div>
                                    <div className='subheader'>
                                        <a href={this.state.jobSelectedEasy['dockerUrl']}><b>Dockerfile</b></a>
                                    </div>
                                </span>
                            </div>
                            <span id='header-details' className="column" style={{ marginRight: -16 }}>
                                <button className="icon-button" onClick={() => this.setState((old: state) => ({ expanded: !old.expanded }))}>
                                    <i className={`material-icons ${this.state.expanded ? "rotate-180" : null}`} aria-label="details">expand_more</i>

                                </button>

                            </span>
                        </div>

                        <span style={{ display: 'flex', justifyContent: 'center' }}>

                            <div className='card shadow1' style={{ cursor: 'default' }}>



                                <div className='content' style={{ marginTop: 20 }}>
                                    {
                                        this.state.jobSelectedEasy['inputs'][this.state.inputStageIdx]['type'] === 'assembly' ? (
                                            <GenomeSelector
                                                species={this.state.jobSelectedEasy['inputs'][this.state.inputStageIdx]['species'] as any}
                                                assemblies={this.state.jobSelectedEasy['inputs'][this.state.inputStageIdx]['assemblies']}
                                                onSelected={(assembly) => this.handleInputSelected(this.state.inputStageIdx, assembly)}
                                            />
                                        ) :
                                            this.state.jobSelectedEasy['inputs'][this.state.inputStageIdx]['type'] === 'vcf' ? (
                                                <div></div>
                                            ) : null

                                    }

                                </div>
                            </div>
                        </span>
                    </Fragment>
                }
            </div >
        );

    }
}

export default withRouter(Item);
