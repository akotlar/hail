import React from "react";
import { removeCallback, JobType, addCallback } from "../../libs/jobTracker/jobTracker";
import "styles/card.scss";
import "styles/pages/public.scss";
import Fuse from 'fuse.js';

declare type state = {
    jobsSelected: [number, number]
    jobType: string;
    jobs: JobType[];
    searchText: string;
    filteredJobs: JobType[];
};

class Jobs extends React.PureComponent {
    state: state = {
        jobType: null,
        jobsSelected: [-1, -1],
        jobs: [],
        searchText: "",
        filteredJobs: [],
    };

    _callbackId?: number = null;

    fuse?: any = null

    static async getInitialProps({ query }: any) {
        return {
            type: query.type
        };
    }

    constructor(props: any) {
        super(props);
    }

    handleChange = selectedOption => {
        this.setState({ selectedOption });
    };

    componentWillUnmount() {
        removeCallback((this.props as any).type, this._callbackId);
    }

    componentDidMount() {
        const type = (this.props as any).type;

        this._callbackId = addCallback(type, (data: JobType[]) => {
            if (this.state.jobs != data) {
                this.setState(() => ({ jobs: data, filteredJobs: data }));

                this.fuse = new Fuse(data, {
                    shouldSort: true,
                    threshold: 0,
                    location: 0,
                    distance: 10,
                    maxPatternLength: 32,
                    minMatchCharLength: 1,
                    tokenize: true,
                    // matchAllTokens: true,
                    findAllMatches: true,
                    keys: [
                        "name", 'inputFileName', 'createdAt', 'submittedDate', 'assembly', 'type', 'log.progress', 'visibility'
                    ]
                });
            }
        });
    }

    handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, idx: number) => {
        e.preventDefault();
        // e.stopPropagation();
        // e.nativeEvent.stopImmediatePropagation();
        if (e.shiftKey) {
            let [min, max] = this.state.jobsSelected;

            if (idx == max) {
                min = -1;
                max = -1;
            } else if (idx > min) {
                max = idx;
            } else {
                min = idx;
            }

            this.setState(() => ({
                jobsSelected: [min, max]
            }))

            return;
        }


        this.setState((old: state) => {
            const [old_min, old_max] = old.jobsSelected;

            if (old_min == idx && old_max == idx) {
                return {
                    jobsSelected: [-1, -1]
                }
            }

            return {
                jobsSelected: [idx, idx]
            }
        })
    }

    filterList = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (this.fuse) {
            const input = e.target.value;

            if (!input) {
                this.setState((old: state) => ({
                    filteredJobs: old.jobs
                }));

                return;
            }

            const res = this.fuse.search(input);

            this.setState(() => ({
                filteredJobs: res
            }));
        }
    }

    render() {
        return (
            <div id='public-page' className='centered' style={{ flexDirection: 'row' }}>
                {/* <div id='click-handler' onClick={(e) => this.handleClick(e, -1)} style={{ width: '100%' }}></div> */}
                <div id='fixed'>Test</div>
                <span style={{ flexDirection: 'column', display: 'flex' }}>
                    <input id='public-search' className='outlined' type='text' placeholder='search' onChange={(e) => this.filterList(e)} />


                    {this.state.filteredJobs.map((job, idx) =>
                        <div key={idx} className={`card shadow1 ${idx >= this.state.jobsSelected[0] && idx <= this.state.jobsSelected[1] ? 'selected' : ''}`} onClick={(e) => this.handleClick(e, idx)} >
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
                </span>
            </div>
        );

    }
}

export default Jobs;
