import { PureComponent, Fragment } from "react";
import data, { addCallback, removeCallback, events } from "../../libs/analysisTracker/analysisLister";
import "styles/card.scss";
import "styles/pages/public.scss";
import "styles/pages/share/item.scss"
import GenomeSelector from '../../components/GenomeSelector/GenomeSelector';
import built, { getNode, addNode } from '../../libs/analysisTracker/analysisBuilder';
import SanitizeHtml from '../../components/SanitizeHtml';
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
    hasConfiguration: boolean,
}
declare type state = {
    jobSelected: {};
    jobSelectedEasy?: easy;
    currentNode?: any;
    prevNode?: any;
    nextNode?: any;
    expanded: boolean;
    inputStageIdx: number;
    speciesChosen?: string,
    assemblyChosen?: string,
    showAll: boolean
};

enum link_type_enum {
    input = 1,
    output,
}

const getItems = (job: {}): {} => {
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
        currentNode: null,
        prevNode: null,
        nextNode: null,
        expanded: false,
        inputStageIdx: 0,
        showAll: false
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
        if (getNode(0) === null) {
            console.info('none')
        }

        // const idx = addNode({
        //     data: data[props.id]
        // });

        // const item = getNode(idx);

        // this.set()
        // this.state.jobSelected = data.analyses[props.id];
    }

    set = (data, id, referrer_idx?: number, link_type?: link_type_enum) => {
        if (!data) {
            console.info("Loding");
            return;
        }

        const job = data[id];

        if (!job) {
            console.error("Couldn't find the job");
            return;
        }

        const easyVersion = getItems(job);
        console.info('easy,', easyVersion);
        const [node, idx] = addNode({
            data: easyVersion
        }, referrer_idx);
        console.info('after add', node, idx, typeof (idx));
        let prevNode, nextNode, currentNode;

        if (referrer_idx !== undefined) {
            if (link_type === undefined) {
                throw new Error("When referrer_idx is present, so must be link_type");
            }
            console.info('in', easyVersion);
            if (easyVersion['hasConfiguration'] !== true) {
                console.info("hasConfig", link_type, link_type == link_type_enum.input)
                if (link_type == link_type_enum.input) {
                    console.info('checking idx', idx, getNode(idx as number + 1));
                    prevNode = node;
                    currentNode = getNode(idx + 1);
                    nextNode = getNode(idx + 2);
                } else {
                    nextNode = node;
                    currentNode = getNode(idx - 1);
                    nextNode = getNode(idx - 2);
                }
            }
        } else {
            prevNode = getNode(idx - 1);
            currentNode = node;
            nextNode = getNode(idx + 1);
        }
        console.info("trunk", built);
        console.info("prev current next", prevNode, "curr", currentNode, "next", nextNode);
        // if (referrer_idx !== undefined) {
        //     if (link_type === undefined) {
        //         throw new Error("When referrer_idx is present, so must be link_type");
        //     }

        //     // a url resource for instance
        //     if (easyVersion['hasConfiguration'] !== true) {
        //         if (link_type === link_type_enum.input) {
        //             prevNode = node;
        //             currentNode = getNode(idx + 1);
        //             nextNode = getNode(idx + 2);
        //         } else {
        //             nextNode = node;
        //             currentNode = getNode(idx - 1);
        //             nextNode = getNode(idx - 2);
        //         }
        //     } else {

        //     }
        // }
        // if (easyVersion['type'] === 'resource' && referrer_idx !== undefined) {
        //     prevNode = node;
        //     currentNode = getNode(referrer_idx);
        // } else {
        //     prevNode = getNode(idx - 1);
        //     nextNode = getNode(idx + 1);
        //     currentNode = node
        // }

        console.info('node', node, idx);

        // const prevNode = getNode(idx - 1);
        // const nextNode = getNode(idx + 1);
        console.info('prev, next', prevNode, nextNode);
        this.setState(() => ({
            jobSelected: job,
            jobSelectedEasy: node['data'],
            prevNode,
            nextNode,
            currentNode
        }));
    }

    componentDidMount() {
        this._callbackId = addCallback(events.analyses, (data) => this.set(data, (this.props as any).router.query.id, (this.props as any).router.query.referrer, (this.props as any).router.query.link_type));
    }


    componentWillUnmount() {
        removeCallback(events.analyses, this._callbackId);
    }

    componentDidUpdate(prevProps) {
        const { query } = (this.props as any).router
        // verify props have changed to avoid an infinite loop
        if (query.id !== prevProps.router.query.id) {
            this.set(data.analyses, query.id, query.referrer, query.link_type);
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
            <div id='anayses-item-page' className='centered l-flex'>

                {!this.state.currentNode ? <div>Loading</div> :
                    <Fragment>
                        <span id='analysis-chain' className='l-fg3' style={{ display: 'flex', alignItems: 'center' }}>

                            {this.state.prevNode &&
                                <div className='side-item-wrap before' style={{ position: 'relative' }}>
                                    <div className='analysis-item '>
                                        <div className='card shadow1' style={{ cursor: 'default' }}>
                                            <div className='header column'>
                                                <h4>{this.state.prevNode.data.name}</h4>
                                                <div className='subheader'>
                                                    <SanitizeHtml html={this.state.prevNode.data.description} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <i className='link'></i>
                                </div> || <div className='spacer'></div>
                            }
                            <div className='center-item-wrap'>
                                <div className='analysis-item'>
                                    <div className='row header' style={{ marginTop: 0, display: 'flex' }}>

                                        <div style={{ marginBottom: 30, display: 'flex', padding: 3, flexDirection: 'column' }}>
                                            <h2>{this.state.currentNode['data']['name']}</h2>
                                            {this.state.currentNode['data']['description'] ? <div className='subheader'>

                                                <SanitizeHtml html={this.state.currentNode['data']['description']} />
                                            </div> : null}
                                            <span style={{ display: this.state.expanded ? "initial" : "none" }}>

                                                <div className='subheader'>
                                                    By <a href={this.state.currentNode['data']['authorGithubLink']}><b>{this.state.currentNode['data']['author']}</b></a>
                                                </div>
                                                <div className='subheader'>
                                                    <a href={this.state.currentNode['data']['githubLink']}><b>Project Github Link</b></a>
                                                </div>
                                                <div className='subheader'>
                                                    <a href={this.state.currentNode['data']['dockerUrl']}><b>Dockerfile</b></a>
                                                </div>
                                            </span>
                                        </div>
                                        <span id='header-details' className="column" style={{ marginRight: -16, alignSelf: 'flex-start' }}>
                                            <button className="icon-button" onClick={() => this.setState((old: state) => ({ expanded: !old.expanded }))}>
                                                <i className={`material-icons ${this.state.expanded ? "rotate-180" : null}`} aria-label="details">expand_more</i>

                                            </button>

                                        </span>
                                    </div>




                                    <span style={{ display: 'flex', justifyContent: 'center' }}>

                                        <div className='card shadow1' style={{ cursor: 'default' }}>



                                            <div className='content' style={{ marginTop: 20 }}>
                                                {
                                                    !this.state.currentNode['data']['inputs'].length ? "No inputs" :
                                                        this.state.currentNode['data']['inputs'][this.state.inputStageIdx]['type_category'] === 'assembly' ? (
                                                            (this.state.currentNode['data']['inputs'][this.state.inputStageIdx]['value'] ? <div>Selected</div> :
                                                                <GenomeSelector
                                                                    species={this.state.currentNode['data']['inputs'][this.state.inputStageIdx]['species'] as any}
                                                                    assemblies={this.state.currentNode['data']['inputs'][this.state.inputStageIdx]['assemblies']}
                                                                    onSelected={(assembly) => this.handleInputSelected(this.state.inputStageIdx, assembly)}
                                                                />)
                                                        ) :
                                                            this.state.currentNode['data']['inputs'][this.state.inputStageIdx]['type_category'] === 'file' ? (
                                                                <Fragment>
                                                                    <div className='header column'>
                                                                        <h3>{this.state.currentNode['data']['inputs'][this.state.inputStageIdx]['title']}</h3>
                                                                        <div className='subheader'>
                                                                            <SanitizeHtml html={this.state.currentNode['data']['inputs'][this.state.inputStageIdx]['description']} />
                                                                        </div>

                                                                    </div>
                                                                    <div className='content' style={{ height: 100, width: 150, margin: "0 auto" }} >
                                                                        <div className='row centered' style={{ width: 150, justifyContent: 'space-around', alignItems: 'center' }}>
                                                                            <i className="material-icons">
                                                                                cloud_upload
                                                            </i>
                                                                            <span>or</span>
                                                                            <i className="material-icons" onClick={() => Router.push(`/share?referrer=${this.state.currentNode.idx}&link_type=${link_type_enum.input}`)}>
                                                                                link
                                                        </i>
                                                                        </div>
                                                                    </div>
                                                                </Fragment>
                                                            ) : this.state.currentNode['data']['inputs'][this.state.inputStageIdx]['type_category'] === 'url' ? (
                                                                <Fragment>
                                                                    <a href={this.state.currentNode['data']['inputs'][this.state.inputStageIdx]['value']} target='_blank'>{this.state.currentNode['data']['inputs'][this.state.inputStageIdx]['name']}</a>

                                                                </Fragment>
                                                            ) : null

                                                }

                                            </div>
                                        </div>
                                    </span>
                                </div>
                            </div>
                            {this.state.nextNode &&
                                <div className='side-item-wrap after'>
                                    <div className='analysis-item'>
                                        <div className='card shadow1' style={{ cursor: 'default' }}>
                                            <div className='header column'>
                                                <h4>{this.state.nextNode.data.name}</h4>
                                                <div className='subheader'>
                                                    <SanitizeHtml html={this.state.nextNode.data.description} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <i className='link'></i>
                                </div> || <div className='spacer'></div>
                            }
                        </span>
                    </Fragment >


                }
            </div >
        );

    }
}

export default withRouter(Item);
