import { PureComponent, Fragment } from "react";
import data, { addCallback, removeCallback, events } from "../../libs/analysisTracker/analysisLister";
import "styles/card.scss";
import "styles/pages/public.scss";
import "styles/pages/share/item.scss"
import GenomeSelector from '../../components/GenomeSelector/GenomeSelector';
import { getNode, addNode, clearNodes, getNodes, link_type_enum } from '../../libs/analysisTracker/analysisBuilder';
import SanitizeHtml from '../../components/SanitizeHtml';
import Router, { withRouter } from 'next/router';
import { Swipeable } from 'react-swipeable'

// type easy = {
//     id: string,
//     name: string,
//     steps: [],
//     inputs: [],
//     parameters: [],
//     outputs: [],
//     rating: number,
//     reviews: [],
//     hasConfiguration: boolean,
// }

// function isEquivalent(obj1, obj2) {
//     if (Array.isArray(obj1)) {
//         if (!Array.isArray(obj2)) {
//             return false
//         }

//         for (const idx in obj1) {
//             if (typeof obj1[idx] === 'object') {
//                 if (!isEquivalent(obj1, obj2)) {
//                     return false;
//                 }

//                 continue;
//             }

//             if (obj1 !== obj2) {
//                 return false;
//             }
//         }

//         return true;
//     }

//     if (typeof obj1 === 'object') {
//         if (typeof obj2 !== 'object') {
//             return false;
//         }

//         const keys1 = Object.keys(obj1);
//         const keys2 = Object.keys(obj2);

//         if (keys1.length !== keys2.length) {
//             return false;
//         }

//         for (const key of keys1) {
//             if (!Object.hasOwnProperty(key)) {
//                 return false;
//             }

//             if (typeof obj1[key] === 'object') {
//                 if (!isEquivalent(obj1[key], obj2[key])) {
//                     return false;
//                 }

//                 continue;
//             }

//             if (obj1[key] !== obj2[key]) {
//                 return false;
//             }
//         }
//     }

//     if (typeof obj1 !== typeof obj2) {
//         return false;
//     }

//     return obj1 == obj2;
// }

function munge(data): any {
    console.info("DATA", data);
    if (data['inputs']) {
        if (!data['input_order']) {
            data['input_order'] = Object.keys(data['inputs']).sort();
        }

        data['input_stage'] = data['input_order'][0];
        data['input_stage_idx'] = 0;
        data['input_completed'] = false;
    }

    return data;
}

function mergeInputToOutput(inputComponent, currentComponent): any {
    // Incredibly stupid, sort later
    console.info('inputc', inputComponent);
    for (const key in inputComponent['data']['outputs']) {
        const outputType = inputComponent['data']['outputs'][key]['type'];

        let found = null;

        console.info("output", outputType);
        console.info(currentComponent['data']);
        for (const key in currentComponent['data']['inputs']) {
            console.info("key", key);
            const inputType = currentComponent['data']['inputs'][key]['type'];
            console.info("type", inputType, outputType);
            if (inputType === outputType) {
                console.info("FOUND", inputType);
                found = key;
                break;
            }
        }

        if (!found) {
            throw new Error("Incompatible")
        }

        currentComponent['data']['inputs'][found]['value'] = {
            ref: inputComponent
        }
    }
    return currentComponent;
}

function checkSetInputsCompleted(node) {
    if (node['data']['inputs'] === undefined) {
        return;
    }

    let inner = node['data'];
    let allCompleted = true;
    if (inner['input_stage_idx'] != inner['input_order'].length) {
        let next = inner['input_stage_idx'];

        for (let i = next; i < inner['input_order'].length; i++) {
            const key = inner['input_order'][i];

            if (inner['inputs'][key]['value'] !== null && inner['inputs'][key]['value'] !== undefined) {
                inner['input_stage_idx'] += 1;
            } else {
                allCompleted = false;
                break;
            }
        }
    }

    if (allCompleted) {
        inner['input_completed'] = true;
    }
}

declare type state = {
    currentNode?: any;
    currentNodeIdx?: number;
    hasMoreBefore?: boolean;
    hasMoreAfter?: boolean;
    prevNode?: any;
    nextNode?: any;
    expanded: boolean;
    speciesChosen?: string,
    assemblyChosen?: string,
    showAll: boolean,
    highlightPrevious: boolean,
    highlightNext: boolean
};

class Item extends PureComponent {
    state: state = {
        currentNode: null,
        currentNodeIdx: null,
        hasMoreAfter: null,
        hasMoreBefore: null,
        prevNode: null,
        nextNode: null,
        expanded: false,
        showAll: false,
        highlightPrevious: false,
        highlightNext: false
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

    set = (data, id: number, referrer_idx?: number, link_type?: link_type_enum) => {
        if (referrer_idx === undefined) {
            clearNodes();
        } else if (!getNodes().length) {
            Router.push("/share");
            return;
        }

        if (!data) {
            console.info("Loding");
            return;
        }

        if (!data[id]) {
            console.error("Couldn't find the analysis in the analysis list");
            return;
        }

        // TODO: avoid JSON.parse, use known schema to clone fast
        const analysisComponent = munge(JSON.parse(JSON.stringify(data[id])));

        // console.info('easy,', easyVersion);
        const nodeInfo = addNode({
            data: analysisComponent
        }, referrer_idx, link_type);

        console.info("ADD NODE RESULT", nodeInfo);

        if (!nodeInfo) {
            throw new Error("Couldn't add node");
        }

        let currentNodeIdx = nodeInfo[1];

        // let prevNode, nextNode, currentNode;
        let needsMergeFromInputToCurrent = false;
        if (referrer_idx !== undefined) {
            if (link_type === undefined) {
                throw new Error("link_type must be defined when referrer_idx is defined");
            }

            if (analysisComponent['type'] === 'resource') {
                if (link_type == link_type_enum.input) {
                    currentNodeIdx += 1;

                    needsMergeFromInputToCurrent = true;

                } else {
                    throw new Error("Resources don't take inputs, cannot be targets");
                }
            }
        }

        console.info("CURRENT NODE", nodeInfo[1], currentNodeIdx, referrer_idx, link_type, getNodes());

        let prevNode = getNode(currentNodeIdx - 1);
        let currentNode = getNode(currentNodeIdx);
        let nextNode = getNode(currentNodeIdx + 1);

        if (referrer_idx !== undefined) {
            const cData = currentNode['data'];

            if (analysisComponent['type'] === 'resource') {
                for (const idx in cData['inputs']) {
                    const type = cData['inputs'][idx]['type'];
                    console.info("input", type);
                    const pInput = analysisComponent['outputs'][type];
                    console.info('pintput', pInput);
                    if (pInput) {
                        console.info("found type");

                        cData['inputs'][idx] = pInput;

                    }
                }
            }
        }

        // checkCompatible(currentNode);
        // console.info("trunk", built);
        console.info("prev", prevNode, getNode(0), "curr", currentNode, "next", nextNode);

        const hasMoreBefore = !!(prevNode && getNode(currentNodeIdx - 2));
        const hasMoreAfter = !!(nextNode && getNode(currentNodeIdx + 2));

        if (needsMergeFromInputToCurrent || (prevNode && prevNode['data']['type'] === 'resource')) {
            currentNode = mergeInputToOutput(prevNode, currentNode);

            console.info("merged", currentNode);
        }

        checkSetInputsCompleted(currentNode);

        this.setState(() => ({
            prevNode,
            nextNode,
            currentNode,
            currentNodeIdx,
            hasMoreAfter,
            hasMoreBefore
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
    }

    handleInputSelected(inputKey: number, value: string) {
        this.setState(({ currentNode }: state) => {
            const job = Object.assign({}, currentNode);
            const inner = job['data'];

            inner['inputs'][inputKey]['value'] = value;
            inner['input_stage_idx'] += 1;


            checkSetInputsCompleted(job);
            return {
                currentNode: job
            }
        });

        // console.info("YEP", job);

        // const { query } = (this.props as any).router;

        // Router.push({
        //     pathname: '/share/item',
        //     query: {
        //         id: query.id,
        //     },
        // }, null, { shallow: true });

        // console.info('state', this.state);
    }

    moveFocus = (shiftBy: number) => {
        const currentNodeIdx = this.state.currentNodeIdx + shiftBy;
        const currentNode = getNode(currentNodeIdx);
        const nextNode = getNode(currentNodeIdx + 1);
        const prevNode = getNode(currentNodeIdx - 1);

        const hasMoreBefore = prevNode && !!getNode(currentNodeIdx - 2);
        const hasMoreAfter = nextNode && !!getNode(currentNodeIdx + 2);

        console.info("MOVED", this.state.currentNodeIdx, currentNodeIdx, prevNode, currentNode, nextNode)
        console.info("has more before?", hasMoreAfter);
        console.info("has more after?", hasMoreAfter);

        this.setState(() => ({
            currentNode,
            currentNodeIdx,
            nextNode,
            prevNode,
            hasMoreBefore,
            hasMoreAfter
        }));
    }

    // addPath = () => {
    //     alert("clicked");
    // }
    // //     <md-card-icon-actions layout-align="end center" class="layout-align-end-center">
    // //     <span aria-label="Annotation details" md-labeled-by-tooltip="md-tooltip-191">
    // //       <button class="md-icon-button md-button md-ink-ripple" type="button" ng-transclude="" ng-click="showMore = !showMore">
    // //         <md-icon class="material-icons ng-binding ng-scope" role="img" aria-label="{{!showMore ? 'expand_more' : 'expand_less'}}">
    // //           expand_more
    // //         </md-icon>
    // //       <div class="md-ripple-container"></div></button>

    // //     </span>
    // //   </md-card-icon-actions>
    render() {
        return (
            <div id='anayses-item-page' className='centered l-flex'>

                {!this.state.currentNode ? <div>Loading</div> :
                    <Swipeable onSwipedLeft={(eventData) => console.info(eventData)} >
                        <span id='analysis-chain' className='l-fg3' style={{ display: 'flex', alignItems: 'center' }}>

                            {this.state.prevNode &&
                                <div onClick={() => this.moveFocus(-1)} className={`side-item-wrap before ${this.state.hasMoreBefore ? 'more' : ''} ${this.state.highlightPrevious ? 'highlight' : ''}`} style={{ position: 'relative' }}>
                                    <div className='analysis-item'>
                                        <div className='card shadow1 clickable'>
                                            <div className='header column'>
                                                <h4>{this.state.prevNode.data.name}</h4>
                                                <div className='subheader'>
                                                    <SanitizeHtml html={this.state.prevNode.data.description} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>


                                    <i className='link'></i>
                                </div> || (


                                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                        <button disabled={!this.state.currentNode['data']['inputs']} className='icon-button'
                                            onClick={() => Router.push({
                                                pathname: '/share',
                                                query: { referrer: this.state.currentNodeIdx, link_type: link_type_enum.input }
                                            })}>
                                            <i className="material-icons">
                                                add_circle_outline
                                            </i>
                                        </button></div>



                                )

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
                                                    <a href={this.state.currentNode['data']['authorGithubLink']}><b>{this.state.currentNode['data']['author']}</b></a>
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
                                            <button style={{ cursor: 'pointer' }} className="icon-button" onClick={() => this.setState((old: state) => ({ expanded: !old.expanded }))}>
                                                <i className="fas fa-sliders-h"></i>
                                            </button>
                                            <button className="icon-button" onClick={() => this.setState((old: state) => ({ expanded: !old.expanded }))}>
                                                <i className={`material-icons ${this.state.expanded ? "rotate-180" : null}`} aria-label="details">expand_more</i>

                                            </button>

                                        </span>
                                    </div>




                                    <span style={{ display: 'flex', justifyContent: 'center' }}>

                                        <div className='card shadow1 clickable'>




                                            <div className='content' style={{ marginTop: 20 }}>
                                                {
                                                    !this.state.currentNode['data']['inputs'] ? "No inputs" :
                                                        (
                                                            this.state.currentNode['data']['input_completed'] ?
                                                                <div>Done motherfucker</div>
                                                                :
                                                                this.state.currentNode['data']['inputs'][this.state.currentNode['data']['input_order'][this.state.currentNode['data']['input_stage_idx']]]['type_category'] === 'assembly' ? (
                                                                    (this.state.currentNode['data']['inputs'][this.state.currentNode['data']['input_order'][this.state.currentNode['data']['input_stage_idx']]]['value'] ? <div>Selected: {this.state.currentNode['data']['inputs'][this.state.currentNode['data']['input_order'][this.state.currentNode['data']['input_stage_idx']]]['value']} and {this.state.currentNode['data']['input_order'][this.state.currentNode['data']['input_stage_idx']]}</div> :
                                                                        <GenomeSelector
                                                                            species={this.state.currentNode['data']['inputs'][this.state.currentNode['data']['input_order'][this.state.currentNode['data']['input_stage_idx']]]['species'] as any}
                                                                            assemblies={this.state.currentNode['data']['inputs'][this.state.currentNode['data']['input_order'][this.state.currentNode['data']['input_stage_idx']]]['assemblies']}
                                                                            onSelected={(assembly) => this.handleInputSelected(this.state.currentNode['data']['input_order'][this.state.currentNode['data']['input_stage_idx']], assembly)}
                                                                        />)
                                                                ) :
                                                                    this.state.currentNode['data']['inputs'][this.state.currentNode['data']['input_order'][this.state.currentNode['data']['input_stage_idx']]]['type_category'] === 'file' ? (
                                                                        <Fragment>
                                                                            <div className='header column'>
                                                                                <h3>{this.state.currentNode['data']['inputs'][this.state.currentNode['data']['input_order'][this.state.currentNode['data']['input_stage_idx']]]['title']}</h3>
                                                                                <div className='subheader'>
                                                                                    <SanitizeHtml html={this.state.currentNode['data']['inputs'][this.state.currentNode['data']['input_order'][this.state.currentNode['data']['input_stage_idx']]]['description']} />
                                                                                </div>

                                                                            </div>

                                                                            <div className='content' style={{ height: 100, width: 150, margin: "0 auto" }} >
                                                                                {this.state.currentNode['data']['inputs'][this.state.currentNode['data']['input_order'][this.state.currentNode['data']['input_stage_idx']]]['value'] ?
                                                                                    (this.state.currentNode['data']['inputs'][this.state.currentNode['data']['input_order'][this.state.currentNode['data']['input_stage_idx']]]['value']['ref'] ?

                                                                                        <div className='row centered' style={{ width: 150, justifyContent: 'space-around', alignItems: 'center' }}>
                                                                                            <i className="material-icons" onMouseOver={() => this.setState(() => ({ highlightPrevious: true }))} onMouseLeave={() => this.setState(() => ({ highlightPrevious: false }))}>
                                                                                                link
</i>
                                                                                        </div> : null

                                                                                    ) :
                                                                                    <div className='row centered' style={{ width: 150, justifyContent: 'space-around', alignItems: 'center' }}>
                                                                                        <i className="material-icons">
                                                                                            cloud_upload
                                                            </i>
                                                                                        <span>or</span>
                                                                                        <i className="material-icons" onClick={() => Router.push({
                                                                                            pathname: '/share',
                                                                                            query: {
                                                                                                referrer: this.state.currentNodeIdx,
                                                                                                link_type: link_type_enum.input,
                                                                                            }
                                                                                        })}>
                                                                                            link
                                                        </i>
                                                                                    </div>
                                                                                }
                                                                            </div>
                                                                        </Fragment>
                                                                    ) : this.state.currentNode['data']['inputs'][this.state.currentNode['data']['input_order'][this.state.currentNode['data']['input_stage_idx']]]['type_category'] === 'url' ? (
                                                                        <Fragment>
                                                                            <a href={this.state.currentNode['data']['inputs'][this.state.currentNode['data']['input_order'][this.state.currentNode['data']['input_stage_idx']]]['value']} target='_blank'>{this.state.currentNode['data']['inputs'][this.state.currentNode['data']['input_order'][this.state.currentNode['data']['input_stage_idx']]]['name']}</a>

                                                                        </Fragment>
                                                                    ) : null
                                                        )

                                                }

                                            </div>
                                        </div>
                                    </span>

                                </div>
                            </div>
                            {this.state.nextNode &&

                                <div className={`side-item-wrap after ${this.state.hasMoreAfter ? 'more' : ''}`}>
                                    <i className='link'></i>
                                    <div className='analysis-item' onClick={() => this.moveFocus(1)} >
                                        <div className='card shadow1 clickable'>
                                            <div className='header column'>
                                                <h4>{this.state.nextNode.data.name}</h4>
                                                <div className='subheader'>
                                                    <SanitizeHtml html={this.state.nextNode.data.description} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>


                                </div>
                                || <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className='icon-button' onClick={() => Router.push({
                                    pathname: '/share',
                                    query: {
                                        referrer: this.state.currentNodeIdx,
                                        link_type: link_type_enum.output,
                                    }
                                })}><i className="material-icons">
                                        add_circle_outline
                        </i></button></div>
                            }

                        </span>
                    </Swipeable >


                }
            </div >
        );

    }
}

export default withRouter(Item);
