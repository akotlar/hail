import { PureComponent, Fragment } from "react";
import data, { addCallback, removeCallback, events } from "../../libs/analysisTracker/analysisLister";
import "styles/card.scss";
import "styles/pages/public.scss";
import "styles/pages/share/item.scss"
import GenomeSelector from '../../components/GenomeSelector/GenomeSelector';
import { getNode, addNode, clearNodes, getNodes, link_type_enum } from '../../libs/analysisTracker/analysisBuilder';
import SanitizeHtml from '../../components/SanitizeHtml';
import Router, { withRouter } from 'next/router';
import fetch from 'isomorphic-unfetch';
import { initIdTokenHandler } from '../../libs/auth';
import { isMatch } from 'lodash';
import { addCallback as addSocketioCallback, events as socketioEvents } from '../../libs/socketio';
import ReactTooltip from 'react-tooltip'

type events = {
    submitted: string,
    started: string,
    failed: string,
    completed: string,
    deleted: string
}

const batchEvents: events = {
    submitted: 'batch_submitted',
    started: 'batch_started',
    failed: 'batch_failed',
    completed: 'batch_completed',
    deleted: 'deleted'
};

// function LinkComponent(props) {
//     //  Spread the properties to the underlying DOM element.
//     return <div>{props.children}</div>
// }

console.info("events", batchEvents);
function _setSocketIOlisteners(socket: any) {
    console.info('setting socket io listeners in item.tsx');

    // _removeListeners(socket);

    socket.on(batchEvents.submitted, (data) => {
        console.info('received batch submitted event in item.tsx', data);
        // _forward(events.annotation.submitted, data, _updateJob);
    });

    socket.on(batchEvents.started, (data) => {
        console.info('received batch started event in item.tsx', data);
        // _forward(events.annotation.submitted, data, _updateJob);
    });

    socket.on(batchEvents.failed, (data) => {
        console.info('received batch failed event in item.tsx', data);
        // _forward(events.annotation.submitted, data, _updateJob);
    });

    socket.on(batchEvents.completed, (data) => {
        console.info('received batch completed event in item.tsx', data);
        // _forward(events.annotation.submitted, data, _updateJob);
    });

    socket.on(batchEvents.deleted, (data) => {
        console.info('received batch deleted event in item.tsx', data);
        // _forward(events.annotation.submitted, data, _updateJob);
    });
}

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
    for (const key in inputComponent['data']['outputs']) {
        const output = inputComponent['data']['outputs'][key];
        const outputType = output['type'];

        let found = null;

        for (const key in currentComponent['data']['inputs']) {
            const currentInput = currentComponent['data']['inputs'][key];
            const inputType = currentInput['type'];

            if (inputType === outputType) {
                found = true;

                if (currentInput['category'] === 'file') {
                    if (output['category'] !== 'file') {
                        throw new Error("Incompatible");
                    }

                    const schemaIn = currentInput['schema'];
                    const schemaOut = output['schema'];

                    console.info("schemaIn", schemaIn, "out", schemaOut);

                    // The schema coming from the preceeding component must be equal, or a superset
                    // of the current component, which it will be serving
                    if (!isMatch(schemaOut, schemaIn)) {
                        throw new Error("Incompatible");
                    }
                }

                // TODO: handle deletion
                currentInput['value'] = {
                    ref: inputComponent,
                    ref_output_key: key
                }
            }
        }

        if (!found) {
            throw new Error("Incompatible")
        }
    }

    console.info("compatible", currentComponent);

    return currentComponent;
}


function checkSetInputsCompleted(node): boolean {
    if (node['data']['inputs'] === undefined) {
        return false;
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
        return true;
    }

    return false;
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

    socket?: any = null

    static async getInitialProps({ query }: any) {
        return {
            id: query.id
        };
    }

    submit = (currentNode: any, prevNode?: any) => {
        if (prevNode) {
            currentNode = mergeInputToOutput(prevNode, currentNode);
        }

        if (!checkSetInputsCompleted(currentNode)) {
            return;
        }

        const auth = initIdTokenHandler();

        fetch('/api/jobs/create', {
            method: 'POST', // *GET, POST, PUT, DELETE, etc.
            // mode: 'cors', // no-cors, *cors, same-origin
            // cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'same-origin', // include, *same-origin, omit
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getToken()}`,
                // 'Content-Type': 'application/x-www-form-urlencoded',
            },
            // redirect: 'follow', // manual, *follow, error
            // referrer: 'no-referrer', // no-referrer, *client
            body: JSON.stringify(currentNode['data']) // body data type must match "Content-Type" header
        })
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
        // let needsMergeFromInputToCurrent = false;
        if (referrer_idx !== undefined) {
            if (link_type === undefined) {
                throw new Error("link_type must be defined when referrer_idx is defined");
            }

            if (analysisComponent['type'] === 'resource') {
                if (link_type == link_type_enum.input) {
                    currentNodeIdx += 1;

                    // needsMergeFromInputToCurrent = true;

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

        // if (needsMergeFromInputToCurrent || (prevNode && prevNode['data']['type'] === 'resource')) {
        //     currentNode = mergeInputToOutput(prevNode, currentNode);

        //     console.info("merged", currentNode);
        // }

        this.submit(currentNode, prevNode);
        // console.info("DONE?", currentNode['data']['input_completed']);
        // if (currentNode['data']['input_completed'] === true) {
        //     console.info("SHOULD START RUNNING");
        //     const auth = initIdTokenHandler();

        //     console.info("Transitive dependency", currentNode['data']['inputs']);
        //     console.info("the data", currentNode);
        //     fetch('/api/jobs/create', {
        //         method: 'POST', // *GET, POST, PUT, DELETE, etc.
        //         // mode: 'cors', // no-cors, *cors, same-origin
        //         // cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        //         credentials: 'same-origin', // include, *same-origin, omit
        //         headers: {
        //             'Content-Type': 'application/json',
        //             'Authorization': `Bearer ${auth.getToken()}`,
        //             // 'Content-Type': 'application/x-www-form-urlencoded',
        //         },
        //         // redirect: 'follow', // manual, *follow, error
        //         // referrer: 'no-referrer', // no-referrer, *client
        //         body: JSON.stringify(currentNode['data']) // body data type must match "Content-Type" header
        //     })
        // }

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
        addSocketioCallback(socketioEvents.connected, (socket) => {
            this.socket = socket;
            _setSocketIOlisteners(socket);
        })
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
        this.setState(({ currentNode, prevNode }: state) => {
            const job = Object.assign({}, currentNode);
            const inner = job['data'];

            inner['inputs'][inputKey]['value'] = value;
            inner['input_stage_idx'] += 1;


            this.submit(job, prevNode);
            return {
                currentNode: job
            }
        });
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

    render() {
        return (
            <div id='anayses-item-page' className='centered l-flex'>
                <ReactTooltip />
                {!this.state.currentNode ? <div>Loading</div> :
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

                                <i className='link' data-tip="hello world" />
                            </div> || (


                                <div className={`side-item-wrap before`}>
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

                                    <div className='description'>
                                        <div className='title'>
                                            <h2>{this.state.currentNode['data']['name']}</h2>
                                            <button style={{ cursor: 'pointer' }} className="icon-button" onClick={() => this.setState((old: state) => ({ expanded: !old.expanded }))}>
                                                <i className="fas fa-sliders-h"></i>
                                            </button>
                                        </div>

                                        {this.state.currentNode['data']['description'] ? <div className='subheader'>

                                            <SanitizeHtml html={this.state.currentNode['data']['description']} />
                                            <button className="icon-button" onClick={() => this.setState((old: state) => ({ expanded: !old.expanded }))}>
                                                <i className={`material-icons ${this.state.expanded ? "rotate-180" : null}`} aria-label="details">expand_more</i>

                                            </button>
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

                                </div>




                                <span style={{ display: 'flex', justifyContent: 'center' }}>

                                    <div className='card shadow1 clickable'>




                                        <div className='content'>
                                            {
                                                !this.state.currentNode['data']['inputs'] ? "No inputs" :
                                                    (
                                                        this.state.currentNode['data']['input_completed'] ?
                                                            <Fragment>
                                                                <h3>Running</h3>

                                                            </Fragment>
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
                                                                        <div className='column'>
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
                                        <div className='action'>
                                            <button onClick={() => this.submit(this.state.currentNode, this.state.prevNode)}>Submit</button>
                                        </div>
                                    </div>
                                </span>

                            </div>
                        </div>
                        {this.state.nextNode &&

                            <div className={`side-item-wrap after ${this.state.hasMoreAfter ? 'more' : ''}`}>
                                <i className='link' data-tip="hello world" />
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
                            || <div className={`side-item-wrap after`}><button className='icon-button' onClick={() => Router.push({
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


                }
            </div>
        );

    }
}

export default withRouter(Item);
