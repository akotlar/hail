import React from "react";
// import { removeCallback, JobType, addCallback } from "../libs/jobTracker/jobTracker";
import "styles/card.scss";
import "styles/pages/public.scss";
import Fuse from 'fuse.js';
import Router, { withRouter } from 'next/router';
import available from '../libs/analysisTracker/analysisLister';

// import 'react-use-gesture';
// import DraggableList from '../../components/DraggableList';

declare type state = {
  jobs: any[],
  jobsSelected: [number, number]
  filteredJobs: any[];
  compatibleJobs: any[];
  jobSelected: number;
};

class Jobs extends React.PureComponent {
  state: state = {
    jobs: available,
    jobsSelected: [-1, -1],
    filteredJobs: available,
    compatibleJobs: [],
    jobSelected: null,
  };

  // _callbackId?: number = null;

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

  // componentWillUnmount() {
  //   removeCallback((this.props as any).type, this._callbackId);
  // }

  componentDidMount() {
    // const type = (this.props as any).type;
    this.setState({})
    this.fuse = new Fuse(available, {
      keys: ['name']
    })

    // this._callbackId = addCallback(type, (data: JobType[]) => {
    //   if (this.state.jobs != data) {
    //     this.setState(() => ({ jobs: data, filteredJobs: data }));

    //     this.fuse = new Fuse(data, {
    //       shouldSort: true,
    //       threshold: 0,
    //       location: 0,
    //       distance: 10,
    //       maxPatternLength: 32,
    //       minMatchCharLength: 1,
    //       tokenize: true,
    //       // matchAllTokens: true,
    //       findAllMatches: true,
    //       keys: [
    //         "name", 'inputFileName', 'createdAt', 'submittedDate', 'assembly', 'type', 'log.progress', 'visibility'
    //       ]
    //     });
    //   }
    // });
  }

  componentDidUpdate(prevProps) {
    console.info('prevprops', prevProps, this.props);
    // this.jobSelected
    console.info("ye", (this.props as any).router.query.id);
    const { query } = (this.props as any).router
    // verify props have changed to avoid an infinite loop
    if (query.id !== prevProps.router.query.id) {
      // fetch data based on the new query
      console.info("id", query.id);
      this.setState(() => ({
        jobSelected: typeof query.id === 'undefined' ? null : available[query.id]
      }))
    }
  }

  handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, idx: number) => {
    e.preventDefault();

    // e.stopPropagation();
    // e.nativeEvent.stopImmediatePropagation();
    if (e.shiftKey) {
      let [min, max] = this.state.jobsSelected;

      if (idx > min) {
        max = idx;
      } else if (idx == min) {
        min = idx;
        max = idx;
      } else if (idx > min) {
        max = idx;
      } else {
        min = idx;
      }

      this.setState(() => ({
        jobsSelected: [min, max],
      }))

      return;
    }



    this.setState((old: state) => {
      const [old_min, old_max] = old.jobsSelected;

      if (old_min == idx && old_max == idx) {
        return {
          jobsSelected: [-1, -1],
          compatibleJobs: [],
        }
      }

      const compatible = this.getCompatible(idx);

      return {
        jobsSelected: [idx, idx],
        filteredJobs: [available[idx]],
        compatibleJobs: compatible,
      }
    })

    Router.push('/share?id=1', '/share?id=1', { shallow: true })

  }

  getCompatible: (idx: number) => any[] = (idx) => {
    let job = this.state.jobs[idx];

    console.info(job);

    let res: {
      [type: string]: {
        length: number,
        items: any[],
      }
    } = {};
    Object.keys(job.outputs).forEach(key => {
      const j = job.outputs[key];
      res[key] = {
        length: j.length,
        items: j
      }
    });

    console.info("keys", res);

    let newCompatible = this.state.jobs.filter((job, jIdx) => {
      if (jIdx == idx) {
        return false;
      }

      for (let key in job.inputs) {
        if (!res[key] || res[key].length != job.inputs[key].length) {
          return false;
        }
      }
      return true;
    })

    return newCompatible;
  }

  filterList = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (this.fuse) {
      const input = e.target.value;

      if (!input) {
        this.setState((old: state) => ({
          filteredJobs: old.jobs,
          jobsSelected: [-1, -1]
        }));

        return;
      }

      const res = this.fuse.search(input);

      this.setState(() => ({
        filteredJobs: res,
        jobsSelected: [-1, -1]
      }));
    }
  }

  render() {
    return (
      <div id='public-page' className='centered'>
        {this.state.jobSelected !== null ?
          <div>Stuff</div> :

          <span className='right'>
            <input id='public-search' className='outlined' type='text' placeholder='search' onChange={(e) => this.filterList(e)} />
            <span id='control-center'>
              <button id='delete' className='icon-button red' disabled={this.state.jobsSelected[0] === -1}>
                <i className='material-icons left'>
                  delete_outline
                        </i>
              </button>
              <div>{this.state.jobsSelected[0] === -1 ? 0 : (this.state.jobsSelected[1] == this.state.jobsSelected[0] ? 1 : this.state.jobsSelected[1] - this.state.jobsSelected[0] + 1)} selected</div>
            </span>

            {this.state.filteredJobs.map((job, idx) =>
              <div key={idx} className={`card shadow1 ${idx >= this.state.jobsSelected[0] && idx <= this.state.jobsSelected[1] ? 'selected' : ''}`} onClick={(e) => this.handleClick(e, idx)} >
                <div className='header'>
                  <h5>{job.name}</h5>
                  <i className="material-icons">
                    edit
                  </i>
                </div>
                <div className='content'>
                  <div className='row'>
                    <span className='left'>Created on:</span>
                    <b className='right'>{job.name}</b>
                  </div>
                  <div className='row'>
                    <h5 className='left'>Inputs</h5>
                    {Object.entries(job.inputs).map(val => {
                      <b className='right'>{val[0]}</b>
                    })}
                  </div>
                  {/* <div className='row'>
                  <span className='left'>{job.type == 'annotation' ? "Input:" : "Query:"}</span>
                  <b className='right'>
                    {
                      job.type == 'annotation'
                        ? <a href={job.inputFileName}>{job.inputFileName}</a>
                        : "Some query"
                    }
                  </b>
                </div> */}
                </div>
              </div>
            )}
            {/* {(this.state.compatibleJobs.length > 0 &&
            <div id='compatible' >
              <h3>Compatible</h3>
              {this.state.compatibleJobs.map((job, idx) =>
                <div key={idx} className={`card shadow1 ${idx >= this.state.jobsSelected[0] && idx <= this.state.jobsSelected[1] ? 'selected' : ''}`} onClick={(e) => this.handleClick(e, idx)} >
                  <h5 className='header'>{job.name}</h5>
                  <div className='content'>
                    <div className='row'>
                      <span className='left'>Created on:</span>
                      <b className='right'>{job.name}</b>
                    </div>
                    <div className='row'>
                      <h5 className='left'>Inputs</h5>
                      {Object.entries(job.inputs).map(val => {
                        <b className='right'>{val[0]}</b>
                      })}
                    </div>
                  
                  </div>
                </div>
              )}
            </div>)} */}

          </span>
        }
      </div>
    );

  }
}

export default withRouter(Jobs);
