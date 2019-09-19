import { PureComponent } from 'react';
// import getConfig from "next/config";

import '../styles/pages/share.scss';
// const url = getConfig().publicRuntimeConfig.API.BASE_URL;
// import Router from 'next/router';
// import jobTracker, { addCallback, removeCallback } from "../libs/jobTracker/jobTracker";
import "styles/card.scss";
import "styles/pages/public.scss";
import 'isomorphic-unfetch';


declare type props = {
  pageProps: {
    available: [];
  };
};

declare type component = {
  name: string,
  id: string,
  inputs: {
    [type: string]: {
      name: string,
      path: string
    }[]
  },
  outputs: {
    [type: string]: {
      name: string,
      path: string
    }[]
  },
};

declare type state = {
  unauthorized: boolean,
  available: component[],
  selectedComponents: component[],
  alive: [],
  filteredComponents: component[],
  loading: number, //-1, 0, 1: failed, not, loading
  data: object[],
  myJobs: object[],
};




// let _callbackId: number;
const queryType = "public";

// TODO: decide whether we want to show only notebooks whose svc and pod status
// TODO: check that there are no side-effects for mutating this.state.notebooks
// are both Running
// Argument against this is to give fine-grained insight into what Kube is doing
// Because Kube is not a good queue, and will give out-of-order events
// which may be easier for the user to understand, that for us to present always as in-order
class PipelinePage extends PureComponent<any, state> {
  state: state = {
    data: [{
      type: "vcf",
      name: "My cool file",
      path: "s3://1000g-vcf/ALL.chr1.phase3_shapeit2_mvncall_integrated_v5a.20130502.genotypes.100Klines_rand.vcf.gz"
    }],
    myJobs: [],
    loading: 0,
    unauthorized: false,
    selectedComponents: [],
    available: [
      {
        "name": "My Cool thing VCF",
        id: "1",
        inputs: {
          "vcf": [{
            name: "My cool file",
            path: "/path/to/file"
          }],
        },
        "outputs": {
          "MatrixTable": [{
            name: "some file",
            path: "/path/to/file"
          }]
        }

      },
      {
        "name": "My Cool thing MatrixTable",
        id: "2",
        inputs: {
          "MatrixTable": [{
            name: "some file",
            path: "/path/to/file"
          }]
        },
        "outputs":
        {
          "Table": [{
            name: "some file",
            path: "/path/to/file"
          }],
        }

      },
      {
        "name": "My Cool thing Table",
        id: "3",
        inputs: {
          "Table": [{
            name: "some file",
            path: "/path/to/file"
          }]
        },
        "outputs":
        {
          "MatrixTable": [{
            name: "some file",
            path: "/path/to/file"
          }],
        }

      },
    ]
    ,
    filteredComponents: [],
    alive: []
  };



  static async getInitialProps({ query }: any) {
    return {
      type: query.type || queryType
    };
  }

  // handleChange = selectedOption => {
  //   this.setState({ sele });
  // };


  componentWillUnmount() {
    // removeCallback(this.state.jobType, _callbackId);
  }

  constructor(props: props) {
    super(props);
    this.state.filteredComponents = this.state.available;
    // this.state.myJobs = jobTracker.

    // _callbackId = addCallback(props.type, data => {
    //   this.setState(() => ({
    //     jobs: data
    //   }));
    // });
  }

  handleDataDropped = (event) => {
    const [idx, id] = event.dataTransfer.getData('pipelineStep');

    console.info("stuff", event.dataTransfer.getData('pipelineStep'), idx, id);

    this.setState((prevState) => {
      const n = [].concat(prevState.selectedComponents, this.state.available[idx]);

      return {
        selectedComponents: n
      }
    });

    this.filterCompatible(idx);
    // Router.push('/share/run')
    // fetch(`${url}/jobs/submit/pipeline`, {
    //   method: "POST"
    // })
    //   .then(r => r.json())
    //   .then(data => {
    //     console.info("data", data);
    //   })
    //   .catch(e => {
    //     console.info(e.message);
    //     console.info("failed to fetch", e.message);
    //   });
  }

  handleDragStart = (event, idx, id) => {
    event.dataTransfer.setData("pipelineStep", [idx, id]);
    console.info('e', event.dataTransfer.getData("pipelineStep"))
  }

  filterCompatible = (idx: number) => {
    let job = this.state.available[idx];

    console.info(job);

    let res = {};
    Object.keys(job.outputs).forEach(key => {
      res[key] = job.outputs[key].length;
    });

    console.info("keys", res);

    let newCompatible = this.state.available.filter((job, jIdx) => {
      if (jIdx == idx) {
        return false;
      }

      for (let key in job.inputs) {
        if (!res[key] || res[key] != job.inputs[key].length) {
          return false;
        }
      }
      return true;
    })

    console.info(newCompatible);

    this.setState({
      filteredComponents: newCompatible
    })
  }

  render() {
    return (
      <div id="share">
        {/* <div id='left-navbar'>
          <ul>
            <li className='draggable' draggable onDragStart={() => console.info('started')}>
              Data 1
            </li>
            <li className='draggable' draggable onDragStart={() => console.info('started')}>
              Data 2
            </li>

          </ul>
        </div> */}


        <div className='item-list' style={{ 'display': 'flex', 'marginLeft': 0 }}
        >
          {/* <i
            className="material-icons link-button"
            style={{ marginLeft: '56px' }}

          >
            add_circle_outline
                </i> */}
          {
            this.state.filteredComponents.map((item, idx) =>
              <div key={idx} onClick={() => this.filterCompatible(idx)} className='card shadow1'
                style={{ flexDirection: 'column', alignItems: 'flex-start' }}
                draggable
                onDragStart={(e) => this.handleDragStart(e, idx, item.id)}>
                <h4>{item.name}</h4>
                Welcome to the future of sharing
                  <div className='body'>
                  <h5>Inputs</h5>
                  <h5>Outputs</h5>
                </div>
                <div className="ratings">
                  <div className="empty-stars"></div>
                  <div className="full-stars" style={{ width: "70%" }}></div>
                </div>
              </div>
            )}


        </div>
        <div id='selected-items' className='item-list'
          onDragOver={(e) => e.preventDefault()}
          onDrop={this.handleDataDropped}
        >
          {/* <i
            className="material-icons link-button"
            style={{ marginLeft: '56px' }}

          >
            add_circle_outline
                </i> */}
          {
            this.state.selectedComponents.length == 0 ?
              <div id='dropper'>Drop Me bitch</div>

              : this.state.selectedComponents.map((item, idx) => {
                console.info("item", item);
                return (
                  <div key={idx} onClick={() => this.filterCompatible(idx)} className='card'
                    style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <h4>{item.name}</h4>
                    Welcome to the future of sharing
                  <div className='body'>
                      <h5>Inputs</h5>
                      <h5>Outputs</h5>
                    </div>
                    <div className="ratings">
                      <div className="empty-stars"></div>
                      <div className="full-stars" style={{ width: "70%" }}></div>
                    </div>
                  </div>)
              })}


        </div>
      </div >
    );
  }
}

export default PipelinePage;
