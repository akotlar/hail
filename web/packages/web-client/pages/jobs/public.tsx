import React from "react";
import jobTracker, { addCallback, removeCallback } from "../../libs/jobTracker/jobTracker";
import "styles/card.scss";
import "styles/pages/public.scss";

let _callbackId: number;
const queryType = "public";

// https://stackoverflow.com/questions/46709773/typescript-react-rendering-an-array-from-a-stateless-functional-component
// const JobList = (props: { jobs: any }, ch) => (
//   <React.Fragment>
//     <Select
//         onChange={this.handleChange}
//         options={jobs}
//       />
//   </React.Fragment>
// );

// const options = [
//   { value: 'chocolate', label: 'Chocolate' },
//   { value: 'strawberry', label: 'Strawberry' },
//   { value: 'vanilla', label: 'Vanilla' },
// ];

class Jobs extends React.Component {
  state = {
    jobs: jobTracker.public,
    jobType: queryType,
    jobSelected: null
  };

  static async getInitialProps({ query }: any) {
    return {
      type: query.type || queryType
    };
  }

  constructor(props: any) {
    super(props);

    this.state.jobType = props.type;

    _callbackId = addCallback(props.type, data => {
      this.setState(() => ({
        jobs: data
      }));
    });
  }

  handleChange = selectedOption => {
    this.setState({ selectedOption });
  };


  componentWillUnmount() {
    removeCallback(this.state.jobType, _callbackId);
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
