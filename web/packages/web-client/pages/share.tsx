import { Fragment, PureComponent } from "react";
// import { removeCallback, JobType } from "../libs/jobTracker/jobTracker";
import "styles/card.scss";
import "styles/pages/public.scss";
import Fuse from 'fuse.js';
import Router, { withRouter } from 'next/router';
import data from '../libs/analysisTracker/analysisLister';
// import ClickAwayListener from 'react-click-away-listener';
// import '@material/slider/';
// import Card, {
//   CardPrimaryContent,
//   CardMedia,
//   CardActions,
//   CardActionButtons,
//   CardActionIcons
// } from "@material/react-card";
// import { MDCSlider } from '@material/slider';
import Slider from '@material-ui/core/Slider';

// if (MDCSlider) {
//   console.info('got it')
// }
// import 'react-use-gesture';
// import DraggableList from '../../components/DraggableList';

// import { MDCRipple } from '@material/ripple';

// const selector = '.mdc-button, .mdc-icon-button, .mdc-card__primary-action';
// const ripples = [].map.call(document.querySelectorAll(selector), function (el) {
//   return new MDCRipple(el);
// });

declare type state = {
  jobs: any[],
  // datasets: JobType[];
  // filteredDatasets: JobType[];
  // datasetsSelected: [number, number]
  jobsSelected: [number, number]
  filteredJobs: any[];
  compatibleJobs: any[];
  jobSelected: number;
};

class Jobs extends PureComponent {
  state: state = {
    jobs: data.analysesArray,
    // datasets: [],
    // datasetsSelected: [-1, -1],
    // filteredDatasets: [],
    jobsSelected: [-1, -1],
    filteredJobs: data.analysesArray,
    compatibleJobs: [],
    jobSelected: null,
  };

  _callbackId?: number = null;

  fuse?: any = null

  jobType = 'completed'

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

  componentDidMount() {
    // enable for analysis list
    // this._callbackId = addCallback('completed', (data: JobType[]) => {
    //   if (this.state.jobs != data) {
    //     this.setState(() => ({ datasets: data, filteredDatasets: data }));

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

    this.fuse = new Fuse(data.analysesArray, {
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


  componentWillUnmount() {
    // removeCallback(this.jobType, this._callbackId);
  }

  componentDidUpdate(prevProps) {
    const { query } = (this.props as any).router
    // verify props have changed to avoid an infinite loop
    if (query.id !== prevProps.router.query.id) {
      // fetch data based on the new query
      console.info("id", query.id);
      this.setState(() => ({
        jobSelected: typeof query.id === 'undefined' ? null : data.analysesArray[query.id]
      }))
    }
  }

  // handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, idx: number) => {
  //   e.preventDefault();

  //   // e.stopPropagation();
  //   // e.nativeEvent.stopImmediatePropagation();
  //   if (e.shiftKey) {
  //     let [min, max] = this.state.jobsSelected;

  //     if (idx > min) {
  //       max = idx;
  //     } else if (idx == min) {
  //       min = idx;
  //       max = idx;
  //     } else if (idx > min) {
  //       max = idx;
  //     } else {
  //       min = idx;
  //     }

  //     this.setState(() => ({
  //       jobsSelected: [min, max],
  //     }))

  //     return;
  //   }



  //   this.setState((old: state) => {
  //     const [old_min, old_max] = old.jobsSelected;

  //     if (old_min == idx && old_max == idx) {
  //       return {
  //         jobsSelected: [-1, -1],
  //         compatibleJobs: [],
  //       }
  //     }

  //     const compatible = this.getCompatible(idx);

  //     return {
  //       jobsSelected: [idx, idx],
  //       filteredJobs: [available[idx]],
  //       compatibleJobs: compatible,
  //     }
  //   })

  //   // Router.push('/share?id=1', '/share?id=1', { shallow: true })

  // }

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

  selectJob = (_: any, job) => {
    // e.preventDefault();
    // if (e.target === e.currentTarget) {
    //   Router.push(`/share/item?${job.id}`, `/share/item?id=${job.id}`, { shallow: false })
    // }
    // this.setState({ jobSelected: job })
    event.preventDefault();
    console.info("id")
    Router.push(`/share/item?id=${job.id}`, `/share/item?id=${job.id}`, { shallow: false })
    console.log(event.target, event.currentTarget);
    // Router.push(`/share/item?${job.id}`, `/share/item?id=${job.id}`, { shallow: true })
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
        {/* {this.state.jobSelected !== null ?
          <div>Stuff</div> : */}
        <Fragment>
          {/* <span id="left-list" className='list'>
            <input id='public-search' className='outlined' type='text' placeholder='search datasets' onChange={(e) => this.filterList(e)} />
            <span className='job-list'>
              {this.state.filteredDatasets.map((job, idx) =>
                <div key={idx} className={`card shadow1 ${idx >= this.state.jobsSelected[0] && idx <= this.state.jobsSelected[1] ? 'selected' : ''}`} >
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
          </span> */}
          <span id='right-list' className='list'>
            <span id='control-center'>
              <input id='public-search' className='outlined' type='text' placeholder='search analysis components' onChange={(e) => this.filterList(e)} />
              {/* <div>({this.state.jobsSelected[0] === -1 ? 0 : (this.state.jobsSelected[1] == this.state.jobsSelected[0] ? 1 : this.state.jobsSelected[1] - this.state.jobsSelected[0] + 1)} selected)</div>
              <button id='delete' className='icon-button red' disabled={this.state.jobsSelected[0] === -1}>
                <i className='material-icons left'>
                  delete_outline
                        </i>
              </button> */}

            </span>
            <span className='job-list'>
              <Slider
                defaultValue={30}
                // getAriaValueText={valuetext}
                aria-labelledby="discrete-slider"
                valueLabelDisplay="auto"
                step={10}
                marks
                min={10}
                max={110}
              />
              {this.state.filteredJobs.map((job, idx) =>
                <div key={idx} onClick={(e) => this.selectJob(e, job)} className={`card shadow1 ${idx >= this.state.jobsSelected[0] && idx <= this.state.jobsSelected[1] ? 'selected' : ''}`} >
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
                  <div className='content footer'>
                    <button className='icon-button' style={{ alignSelf: 'flex-end' }}>
                      <i className="material-icons">
                        keyboard_arrow_down
                      </i>
                    </button>
                  </div>
                </div>
              )}
            </span>
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
        </Fragment>




        {/* } */}
      </div >
    );

  }
}

export default withRouter(Jobs);
