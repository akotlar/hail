import { Fragment, PureComponent } from "react";
// import { removeCallback, JobType } from "../libs/jobTracker/jobTracker";
import "styles/card.scss";
import "styles/pages/public.scss";
import Fuse from "fuse.js";
import Router, { withRouter } from "next/router";
import data from "../libs/analysisTracker/analysisLister";

// TODO: make this actually pull from the database

declare type state = {
  jobs: any[];
  // datasets: JobType[];
  // filteredDatasets: JobType[];
  // datasetsSelected: [number, number]
  jobsSelected: [number, number];
  filteredJobs: any[];
  compatibleJobs: any[];
  // jobSelected: number;
  expanded: {};
  opacity: number;
  // referrer: number;
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
    // jobSelected: null,
    expanded: {},
    opacity: 0.45
    // referrer: null,
  };

  _callbackId?: number = null;

  query?: any;

  fuse?: any;

  jobType = "completed";

  listenClick = () => {
    if (this.state.opacity !== 100) {
      this.setState({ opacity: 100 });
    }
  };

  static async getInitialProps({ query }: any) {
    // const referrer = typeof query.referrer === 'undefined' ? null : query.referrer;

    return {
      query
    };
  }

  constructor(props: any) {
    super(props);

    // this.state.type = query.type;
    this.query = props.query;
    if (this.query.referrer !== undefined) {
      this.state.opacity = 100;
    }
  }

  handleChange = selectedOption => {
    this.setState({ selectedOption });
  };

  componentDidMount() {
    window.addEventListener("click", this.listenClick);
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
        "description.title",
        "description.author",
        "inputFileName",
        "createdAt",
        "submittedDate",
        "assembly",
        "type",
        "log.progress",
        "visibility"
      ]
    });
  }

  componentWillUnmount() {
    window.removeEventListener("onclick", this.listenClick);
    // removeCallback(this.jobType, this._callbackId);
  }

  componentDidUpdate() {
    const { query } = (this.props as any).router;
    this.query = query;

    // // verify props have changed to avoid an infinite loop
    // if (query.id !== prevProps.router.query.id) {
    //   // fetch data based on the new query
    //   this.setState(() => ({
    //     jobSelected: typeof query.id === 'undefined' ? null : data.analysesArray[query.id]
    //   }))
    // }
  }

  getCompatible: (idx: number) => any[] = idx => {
    let job = this.state.jobs[idx];

    console.info(job);

    let res: {
      [type: string]: {
        length: number;
        items: any[];
      };
    } = {};
    Object.keys(job.outputs).forEach(key => {
      const j = job.outputs[key];
      res[key] = {
        length: j.length,
        items: j
      };
    });

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
    });

    return newCompatible;
  };

  selectJob = (_: any, job) => {
    event.preventDefault();
    console.info("id");

    Router.push({
      pathname: "/share/item",
      query: {
        id: job._id,
        ...this.query
      }
    });

    console.log(event.target, event.currentTarget);
  };

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
  };

  handleDetailClick = (e: any, job) => {
    e.stopPropagation();

    console.info("e", e.target, job._id);

    this.setState((old: state) => {
      // Mutating old directly prevents reconciler from seeing the change
      const expanded = Object.assign({}, old.expanded);

      expanded[job._id] = !expanded[job._id];
      console.info("tis", expanded);
      return {
        expanded
      };
    });
  };

  render() {
    return (
      <div id="public-page" className="centered">
        {/* {this.state.jobSelected !== null ?
          <div>Stuff</div> : */}
        <Fragment>
          {/* <span id="list-list" className="list">
            <h2>1. Choose</h2>
          </span> */}
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
          <span id="right-list" className="list">
            <span className="card shadow1 clickable" id="control-center">
              <input
                id="public-search"
                className="outlined"
                type="text"
                placeholder="1. Start with an analysis"
                onChange={e => this.filterList(e)}
                onClick={() => this.setState({ opacity: 100 })}
              />
              {/* <div>({this.state.jobsSelected[0] === -1 ? 0 : (this.state.jobsSelected[1] == this.state.jobsSelected[0] ? 1 : this.state.jobsSelected[1] - this.state.jobsSelected[0] + 1)} selected)</div>
              <button id='delete' className='icon-button red' disabled={this.state.jobsSelected[0] === -1}>
                <i className='material-icons left'>
                  delete_outline
                        </i>
              </button> */}
            </span>
            <span className="job-list" style={{ opacity: this.state.opacity }}>
              {/* <Slider
                defaultValue={30}
                // getAriaValueText={valuetext}
                aria-labelledby="discrete-slider"
                valueLabelDisplay="auto"
                step={10}
                marks
                min={10}
                max={110}
              /> */}
              {this.state.filteredJobs.map((job, idx) => (
                <div
                  key={idx}
                  onClick={e => this.selectJob(e, job)}
                  className={`card clickable shadow1 ${
                    idx >= this.state.jobsSelected[0] &&
                    idx <= this.state.jobsSelected[1]
                      ? "selected"
                      : ""
                  }`}
                >
                  <div className="column">
                    <h3>{job.description.title}</h3>
                    <div className="subheader">{job.description.subtitle}</div>
                    <div className="subheader">
                      By
                      <a className="right" href={job.description.authorUrl}>
                        {job.description.author}
                      </a>
                    </div>
                  </div>
                  <div className="content footer">
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%"
                      }}
                    >
                      <a href="#">
                        <b>{job.description.citations.length} citations</b>
                      </a>
                      <button
                        className={`icon-button`}
                        style={{ alignSelf: "flex-end" }}
                        onClick={e => this.handleDetailClick(e, job)}
                      >
                        <i
                          className={`material-icons ${
                            this.state.expanded[job._id] ? "rotate-180" : ""
                          }`}
                        >
                          keyboard_arrow_down
                        </i>
                      </button>
                    </span>
                    <div
                      className="content"
                      style={{
                        display: this.state.expanded[job._id] ? "block" : "none"
                      }}
                    >
                      Contrary to popular belief, Lorem Ipsum is not simply
                      random text. It has roots in a piece of classical Latin
                      literature from 45 BC, making it over 2000 years old.
                      Richard McClintock, a Latin professor at Hampden-Sydney
                      College in Virginia, looked up one of the more obscure
                      Latin words, consectetur, from a Lorem Ipsum passage, and
                      going through the cites of the word in classical
                      literature, discovered the undoubtable source. Lorem Ipsum
                      comes from sections 1.10.32 and 1.10.33 of "de Finibus
                      Bonorum et Malorum" (The Extremes of Good and Evil) by
                      Cicero, written in 45 BC. This book is a treatise on the
                      theory of ethics, very popular during the Renaissance. The
                      first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..",
                      comes from a line in section 1.10.32.
                    </div>
                  </div>
                </div>
              ))}
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
      </div>
    );
  }
}

export default withRouter(Jobs);
