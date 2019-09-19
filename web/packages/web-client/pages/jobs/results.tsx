import React from "react";
import jobTracker, { removeCallback, JobType, addCallback } from "../../libs/jobTracker/jobTracker";
import "styles/card.scss";
import "styles/pages/public.scss";

let _callbackId: number;
const queryType = "completed";

declare type state = {
    jobSelected?: JobType;
    jobType: string
    jobs: JobType[]
};

class Jobs extends React.Component {
    state: state = {
        jobType: queryType,
        jobSelected: null,
        jobs: jobTracker.completed,
    };

    static getInitialProps({ query }: any) {
        return {
            type: query.type || queryType
        };
    }

    constructor(props: any) {
        super(props);
        this.state.jobType = props.type;
    }

    handleChange = selectedOption => {
        this.setState({ selectedOption });
    };

    componentWillUnmount() {
        removeCallback(this.state.jobType, _callbackId);
    }

    componentDidMount() {
        _callbackId = addCallback(this.state.jobType, (data: JobType[]) => {
            if (this.state.jobs != data) {
                this.setState(() => ({ jobs: data }));
            }
        });
    }

    render() {
        return (
            <div id='public-page' className='centered'>
                <input id='public-search' className='outlined' type='text' placeholder='search' />
                {this.state.jobs.map((job, idx) =>
                    <div key={idx} className='card shadow1'>
                        <h5 className='header'>{job.name}</h5>
                        <div className='content'>
                            <div className='row'>
                                <span className='left'>Created on:</span>
                                <b className='right'>{job.createdAt}</b>
                            </div>
                            <div className='row'>
                                <span className='left'>Assembly</span>
                                <b className='right'>{job.assembly}</b>
                            </div>
                            <div className='row'>
                                <span className='left'>{job.type == 'annotation' ? "Input:" : "Query:"}</span>
                                <b className='right'>
                                    {
                                        job.type == 'annotation'
                                            ? <a href={job.inputFileName}>{job.inputFileName}</a>
                                            : "Some query"
                                    }
                                </b>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );

    }
}

export default Jobs;
