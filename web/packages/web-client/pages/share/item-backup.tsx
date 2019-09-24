import { PureComponent } from "react";
import data, { addCallback, removeCallback, events } from "../../libs/analysisTracker/analysisLister";
import "styles/card.scss";
import "styles/pages/public.scss";
import "styles/pages/share/item.scss"

import { withRouter } from 'next/router';

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
            console.info('updated', query.id, prevProps.router.query.id)
            this.set(data.analyses, query.id);
        }
    }

    addPath = () => {
        alert("clicked");
    }

    render() {
        return (
            <div id='anayses-item-page'>
                {!this.state.jobSelectedEasy ? <div>Loading</div> :
                    <div className='card' style={{ cursor: 'default' }}>
                        <div className='header column' >
                            <h1 >{this.state.jobSelectedEasy['name']}</h1>
                            <div className='subheader'>
                                By <a href={this.state.jobSelectedEasy['authorGithubLink']}><b>{this.state.jobSelectedEasy['author']}</b></a>
                            </div>
                            <div className='subheader'>
                                <a href={this.state.jobSelectedEasy['githubLink']}><b>Project Github Link</b></a>
                            </div>
                            <div className='subheader'>
                                <a href={this.state.jobSelectedEasy['dockerUrl']}><b>Dockerfile</b></a>
                            </div>
                        </div>

                        <div className='content' style={{ marginTop: 20 }}>

                            <h4>Inputs</h4>
                            {
                                this.state.jobSelectedEasy['inputs'].map((input) => (
                                    <div className='row'>
                                        <ol>
                                            <li>{input['name']} ( {input['type']} )
                                                    {
                                                    input['from'] == null ?
                                                        <button className='icon-button' onClick={this.addPath}>
                                                            <i className='material-icons'>add</i>
                                                        </button> : <a href={input['from']}>{input['from']}</a>

                                                }
                                            </li>
                                        </ol>
                                    </div>


                                ))}
                        </div>
                    </div>
                }
            </div >
        );

    }
}

export default withRouter(Item);
