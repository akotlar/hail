import { PureComponent, createRef } from "react";
import { removeCallback, JobType, addCallback } from "../libs/jobTracker/jobTracker";
import "styles/card.scss";
import "styles/pages/public.scss";
import Fuse from 'fuse.js';
import Router, { withRouter } from 'next/router';
import available from '../libs/analysisTracker/analysisLister';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

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
// a little function to help us with reordering the result
// const reorder = (list, startIndex, endIndex) => {
//   const result = Array.from(list);
//   const [removed] = result.splice(startIndex, 1);
//   result.splice(endIndex, 0, removed);

//   return result;
// };


// const move = (source, destination, droppableSource, droppableDestination) => {
//   const sourceClone = Array.from(source);
//   const destClone = Array.from(destination);
//   const [removed] = sourceClone.splice(droppableSource.index, 1);

//   destClone.splice(droppableDestination.index, 0, removed);

//   const result = {};
//   result[droppableSource.droppableId] = sourceClone;
//   result[droppableDestination.droppableId] = destClone;

//   return result;
// };

const getItemStyle = (isDragging, draggableStyle) => ({
  // some basic styles to make the items look a bit nicer
  userSelect: 'none',


  // change background colour if dragging
  background: isDragging ? 'lightgreen' : 'inherit',

  // styles we need to apply on draggables
  ...draggableStyle
});

const getListStyle = isDraggingOver => ({
  background: isDraggingOver ? 'lightblue' : 'inherit',
});



declare type state = {
  jobs: any[],
  datasets: JobType[];
  filteredDatasets: JobType[];
  datasetsSelected: [number, number]
  jobsSelected: [number, number]
  filteredJobs: any[];
  compatibleJobs: any[];
  jobSelected: number;
};

class Jobs extends PureComponent {
  state: state = {
    jobs: available,
    datasets: [],
    datasetsSelected: [-1, -1],
    filteredDatasets: [],
    jobsSelected: [-1, -1],
    filteredJobs: available,
    compatibleJobs: [],
    jobSelected: null,
  };

  _callbackId?: number = null;

  fuse?: any = null

  jobType = 'completed'

  leftRef = createRef();
  rightRef = createRef();

  static async getInitialProps({ query }: any) {
    return {
      type: query.type
    };
  }

  constructor(props: any) {
    super(props);
  }

  getList = (id: string) => id === 'data' ? this.state.filteredDatasets : this.state.filteredJobs;

  handleChange = selectedOption => {
    this.setState({ selectedOption });
  };

  componentDidMount() {
    this._callbackId = addCallback('completed', (data: JobType[]) => {
      if (this.state.jobs != data) {
        this.setState(() => ({ datasets: data, filteredDatasets: data }));

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


  componentWillUnmount() {
    removeCallback(this.jobType, this._callbackId);
  }

  componentDidUpdate(prevProps) {
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

  onDragEnd = result => {
    const { destination, combine } = result;
    console.info("doing stuff", result);
    if (combine) {
      console.info("WE're combining");
    }

    // dropped outside the list
    if (!destination) {
      return;
    }

    // if (source.droppableId === destination.droppableId) {
    //   const items = reorder(
    //     this.getList(source.droppableId),
    //     source.index,
    //     destination.index
    //   );


    //   if (source.droppableId === 'analyses') {
    //     this.setState(() => ({
    //       filteredJobs: items
    //     }));
    //   } {
    //     this.setState(() => ({
    //       filteredDatasets: items
    //     }));
    //   }
    // } else {
    //   const result = move(
    //     this.getList(source.droppableId),
    //     this.getList(destination.droppableId),
    //     source,
    //     destination
    //   );

    //   this.setState({
    //     filteredDatasets: result['data'],
    //     filteredJobs: result['analyses']
    //   });
    // }
  };

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

  selectJob = (job: any) => {
    this.setState({ jobSelected: job })
  }

  filterList = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (this.fuse) {
      const input = e.target.value;

      if (!input) {
        this.setState((old: state) => ({
          filteredDatasets: old.datasets,
          datasetsSelected: [-1, -1]
        }));

        return;
      }

      const res = this.fuse.search(input);

      this.setState(() => ({
        filteredDatasets: res,
        datasetsSelected: [-1, -1]
      }));
    }
  }

  render() {
    return (
      <div id='public-page' className='centered'>
        {/* {this.state.jobSelected !== null ?
          <div>Stuff</div> : */}
        <DragDropContext onDragEnd={this.onDragEnd} onDragUpdate={e => console.info('stuff', e.combine)}>
          <Droppable droppableId="data" isCombineEnabled>
            {(provided, _) => (
              <span id="left-list" className='list'>
                <input id='public-search' className='outlined' type='text' placeholder='search datasets' onChange={(e) => this.filterList(e)} />
                <span className='job-list' ref={provided.innerRef}>
                  {this.state.filteredDatasets.map((job, idx) =>
                    <Draggable key={job._id} draggableId={job._id} index={idx} className={`card shadow1 ${idx >= this.state.jobsSelected[0] && idx <= this.state.jobsSelected[1] ? 'selected' : ''}`} >
                      {(provided, snapshot) => (
                        <div className='card' ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={getItemStyle(
                            snapshot.isDragging,
                            provided.draggableProps.style
                          )}>>
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
                    </Draggable>
                  )}
                </span>
              </span>
            )}
          </Droppable>
          <Droppable droppableId="analyses" isCombineEnabled>
            {(provided, snapshot) => (
              <span id='right-list' className='list' ref={provided.innerRef}
                style={getListStyle(snapshot.isDraggingOver)}>
                <input id='public-search' className='outlined' type='text' placeholder='search analysis components' onChange={(e) => this.filterList(e)} />
                <span id='control-center'>
                  <button id='delete' className='icon-button red' disabled={this.state.jobsSelected[0] === -1}>
                    <i className='material-icons left'>
                      delete_outline
                        </i>
                  </button>
                  <div>{this.state.jobsSelected[0] === -1 ? 0 : (this.state.jobsSelected[1] == this.state.jobsSelected[0] ? 1 : this.state.jobsSelected[1] - this.state.jobsSelected[0] + 1)} selected</div>
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
                    <Draggable
                      key={job.id}
                      draggableId={job.id}
                      index={idx}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={getItemStyle(
                            snapshot.isDragging,
                            provided.draggableProps.style
                          )} onClick={() => this.selectJob(job)} className={`card shadow1 ${idx >= this.state.jobsSelected[0] && idx <= this.state.jobsSelected[1] ? 'selected' : ''}`} >
                          <div className='header'>
                            <h4>{job.name}</h4>
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
                            <button className='icon-button'>
                              <i className="material-icons">
                                keyboard_arrow_down
                      </i>
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  )}
                </span>

              </span>
            )}
          </Droppable>
        </DragDropContext>
      </div >
    );

  }
}

export default withRouter(Jobs);
