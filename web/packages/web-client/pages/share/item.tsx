import React from "react";
import data, {
  addCallback,
  removeCallback,
  events
} from "../../libs/analysisTracker/analysisLister";
import "styles/card.scss";
import "styles/pages/public.scss";
import "styles/pages/share/item.scss";
import GenomeSelector from "../../components/GenomeSelector/GenomeSelector";

// import clsx from "clsx";
// import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
// import CircularProgress from "@material-ui/core/CircularProgress";
// import { green } from "@material-ui/core/colors";
// import Button from "@material-ui/core/Button";
// // import Fab from "@material-ui/core/Fab";
// // import CheckIcon from "@material-ui/icons/Check";
// // import SaveIcon from "@material-ui/icons/Save";

// const useStyles = makeStyles((theme: Theme) =>
//   createStyles({
//     root: {
//       display: "flex",
//       alignItems: "center"
//     },
//     wrapper: {
//       margin: theme.spacing(1),
//       position: "relative"
//     },
//     buttonSuccess: {
//       backgroundColor: green[500],
//       "&:hover": {
//         backgroundColor: green[700]
//       }
//     },
//     fabProgress: {
//       color: green[500],
//       position: "absolute",
//       top: 0,
//       left: -1,
//       zIndex: 1
//     },
//     buttonProgress: {
//       color: green[500],
//       position: "absolute",
//       top: "50%",
//       left: "50%",
//       marginTop: -12,
//       marginLeft: -12
//     }
//   })
// );

// function CircularIntegration(props) {
//   const classes = useStyles(props);
//   const [loading, setLoading] = React.useState(false);
//   const [success, setSuccess] = React.useState(false);
//   const timer = React.useRef<NodeJS.Timeout>();
//   const currentNode: analysisItem = props;

//   console.info("currentNode", currentNode);
//   const buttonClassname = clsx({
//     [classes.buttonSuccess]: success
//   });

//   React.useEffect(() => {
//     return () => {
//       clearTimeout(timer.current);
//     };
//   }, []);

//   const handleButtonClick = () => {
//     if (!loading) {
//       setSuccess(false);
//       setLoading(true);
//       timer.current = setTimeout(() => {
//         setSuccess(true);
//         setLoading(false);
//       }, 2000);
//     }
//   };

//   return (
//     <div className={classes.root}>
//       <div className={classes.wrapper}>
//         <button className="icon-button">
//           <i onClick={handleButtonClick} className="material-icons">
//             directions_run
//           </i>
//         </button>

//         <CircularProgress size={40} className={classes.fabProgress} />
//       </div>
//       <div className={classes.wrapper}>
//         <Button
//           variant="contained"
//           color="primary"
//           className={buttonClassname}
//           disabled={loading}
//           onClick={handleButtonClick}
//         >
//           Accept terms
//         </Button>

//         <CircularProgress size={24} className={classes.buttonProgress} />
//       </div>
//     </div>
//   );
// }

import {
  getNode,
  cloneAndAddNode,
  clearNodes,
  // getPrevNode,
  getPrevNodes,
  // getNextNode,
  linkHasPreviousNodes,
  linkHasNextNodes,
  getNextNodes,
  linkNodes,
  getNodeCount,
  analysisItem,
  linkedNode,
  removeLinkByInput,
  submit,
  checkInputsCompleted,
  isSubmitted,
  runningOrSubmitted
  // batchEvents,
  // unCycleAll
} from "../../libs/analysisTracker/analysisBuilder";
import SanitizeHtml from "../../components/SanitizeHtml";
import Router, { withRouter } from "next/router";

enum link_type_enum {
  input = 1,
  output
}

function forceRefresh(old: number) {
  if (old) {
    return null;
  }

  return Math.random();
}

function JobProgress(props: { node: analysisItem }) {
  const currentNode: any = props.node;

  switch (currentNode.submission.state) {
    case "not_submitted": // local case
      return <h3>Not Submitted</h3>;
    case "queued":
      return <h3>Queued</h3>;
    case "submitted":
      return <h3>Submitted</h3>;
    case "started":
      return <h3>Started</h3>;
    case "completed":
      return <h3>Completed</h3>;
    case "failed":
      return <h3>Failed</h3>;
    default:
      return <h3>Unknown</h3>;
  }
}

declare type state = {
  progress: string;
  currentNodeInputCompleted: boolean;
  currentNode?: analysisItem;
  currentNodeDescription?: any;
  currentNodeSpec?: any;
  currentNodeInputs?: any;
  currentNodeOutputs?: any;
  currentInput?: any;
  isLastInput: boolean;
  hasMoreBefore?: boolean;
  hasMoreAfter?: boolean;
  prevNodesDepth1?: linkedNode;
  nextNodesDepth1?: linkedNode;
  expanded: boolean;
  speciesChosen?: string;
  assemblyChosen?: string;
  showAll: boolean;
  highlightPrevious: boolean;
  highlightNext: boolean;
  stepCheckpoint?: number;
};

class Item extends React.PureComponent {
  state: state = {
    stepCheckpoint: null, // force dom update
    currentNodeInputCompleted: false,
    progress: "",
    currentNode: null,
    currentNodeDescription: null,
    currentInput: null,
    currentNodeSpec: null,
    currentNodeInputs: null,
    currentNodeOutputs: null,
    hasMoreAfter: null,
    hasMoreBefore: null,
    prevNodesDepth1: null,
    nextNodesDepth1: null,
    isLastInput: false,
    expanded: false,
    showAll: false,
    highlightPrevious: false,
    highlightNext: false
  };

  keyListener = (e: any) => {
    if (e.keyCode == 37) {
      if (this.state.prevNodesDepth1) {
        this.moveFocus(Object.keys(this.state.prevNodesDepth1)[0]);
      }
    }

    if (e.keyCode == 39) {
      if (this.state.nextNodesDepth1) {
        this.moveFocus(Object.keys(this.state.nextNodesDepth1)[0]);
      }
    }
  };

  _callbackId?: number = null;

  fuse?: any = null;

  jobType = "completed";

  socket?: any = null;

  static async getInitialProps({ query }: any) {
    return {
      id: query.jobID
    };
  }

  submit = (currentNode: any) => {
    // TODO: actually do somehting
    submit(currentNode, () => {
      this.setState((old: state) => ({
        currentNode,
        stepCheckpoint: forceRefresh(old.stepCheckpoint)
      }));
    })
      .then((updateCurrentNode: analysisItem) => {
        console.info("GOT THEN", updateCurrentNode);
        this.setState((old: state) => ({
          currentNode: updateCurrentNode,
          stepCheckpoint: forceRefresh(old.stepCheckpoint)
        }));
      })
      .catch(err => {
        console.error("GOT ERR in item", err);
        this.setState((old: state) => {
          return {
            currentNode: getNode(old.currentNode.jobID),
            stepCheckpoint: Math.random()
          };
        });

        console.info("SET STTE", getNode(this.state.currentNode.jobID));
      });
  };

  constructor(props: any) {
    super(props);
  }

  updateStateForNewComponent = (currentNode: analysisItem) => {
    let hasMoreBefore;
    let hasMoreAfter;
    let currentNodeInputs;
    let currentNodeDescription;
    let currentNodeSpec;
    let prevNodesDepth1;
    let nextNodesDepth1;
    let currentNodeOutputs;

    prevNodesDepth1 = getPrevNodes(currentNode);
    nextNodesDepth1 = getNextNodes(currentNode);
    currentNodeDescription = currentNode.description;
    currentNodeInputs = currentNode.inputs;
    currentNodeSpec = currentNode.spec;
    currentNodeOutputs = currentNode.outputs;
    hasMoreBefore = prevNodesDepth1 && linkHasPreviousNodes(prevNodesDepth1);
    hasMoreAfter = nextNodesDepth1 && linkHasNextNodes(nextNodesDepth1);
    const currentNodeInputCompleted = checkInputsCompleted(currentNode);

    // const isLastInput = currentNodeSpec.input_order[0]
    this.setState((old: state) => ({
      prevNodesDepth1,
      nextNodesDepth1,
      currentNode,
      currentNodeDescription,
      currentNodeSpec,
      currentNodeInputs,
      currentNodeOutputs,
      currentNodeInputCompleted,
      hasMoreAfter,
      hasMoreBefore,
      stepCheckpoint: forceRefresh(old.stepCheckpoint)
    }));
  };

  removeLink = (inputKey: string) => {
    const node = removeLinkByInput(this.state.currentNode, inputKey);
    this.updateStateForNewComponent(node);
  };

  set = (
    analysisList: any,
    newComponentID: string,
    referrerComponentID?: string,
    newComponentType?: link_type_enum
  ) => {
    if (!Object.keys(analysisList).length) {
      console.error("Loding");
      return;
    }

    console.info("FOUND", analysisList, newComponentID);

    if (!analysisList[newComponentID]) {
      console.error(
        "Couldn't find the analysis in the analysis list",
        analysisList
      );
      Router.push("/share");
      return;
    }

    if (referrerComponentID === undefined) {
      clearNodes();
    } else if (getNodeCount() == 0) {
      console.info("returning");
      Router.push("/share");
      return;
    }

    const newNode = cloneAndAddNode(analysisList[newComponentID]);

    let currentNode: analysisItem;

    if (referrerComponentID == undefined) {
      currentNode = newNode;
    } else {
      currentNode = getNode(referrerComponentID);

      if (!currentNode) {
        throw new Error(
          `Couldn't find component for referrer_id: ${referrerComponentID}`
        );
      }

      if (newComponentType == link_type_enum.input) {
        linkNodes(newNode, currentNode);
      } else {
        linkNodes(currentNode, newNode);
      }
    }

    this.updateStateForNewComponent(currentNode);
  };

  componentDidMount() {
    window.addEventListener("keydown", this.keyListener);

    this._callbackId = addCallback(events.analyses, data =>
      this.set(
        data,
        (this.props as any).router.query.id,
        (this.props as any).router.query.referrer,
        (this.props as any).router.query.link_type
      )
    );
  }

  componentWillUnmount() {
    removeCallback(events.analyses, this._callbackId);
    window.removeEventListener("keydown", this.keyListener);
  }

  componentDidUpdate(prevProps) {
    // const test = `{
    //     "$schema": "http://json-schema.org/draft-06/schema#",

    //     "definitions": {
    //       "address": {
    //         "type": "object",
    //         "properties": {
    //           "street_address": { "type": "string" },
    //           "city":           { "type": "string" },
    //           "state":          { "type": "string" }
    //         },
    //         "required": ["street_address", "city", "state"]
    //       }
    //     },

    //     "type": "object",

    //     "properties": {
    //       "billing_address": { "$ref": "#/definitions/address" },
    //       "shipping_address": {
    //         "allOf": [
    //           { "$ref": "#/definitions/address" },
    //           { "properties":
    //             { "type": { "enum": [ "residential", "business" ] } },
    //             "required": ["type"]
    //           }
    //         ]
    //       }
    //     }
    //   }`;

    // console.info("JSON PARSED", JSON.parse(test));
    const { query } = (this.props as any).router;
    console.info("query", query);
    // verify props have changed to avoid an infinite loop
    if (query.id !== prevProps.router.query.id) {
      this.set(data.analyses, query.id, query.referrer, query.link_type);
    }

    // if (
    //   !this.state.running &&
    //   this.state.currentNode !== prevState.currentNode
    // ) {
    //   if (checkInputsCompleted(this.state.currentNode)) {
    //     this.submit(this.state.currentNode);
    //   }
    // }
  }

  // checkSetNodeCompleted(node) {
  //   const completed = checkInputsCompleted(node);

  //   this.setState(() => ({
  //     currentNodeInputCompleted: completed
  //   }));
  // }

  handleInputSelected(input: any, value: string) {
    this.setState(({ currentNode }: state) => {
      const job = Object.assign({}, currentNode);
      const jobData = job;

      input.value = value;
      jobData.spec.input_stage_idx += 1;

      const inputKey = jobData.spec.input_order[jobData.spec.input_stage_idx];
      console.info("input key", inputKey);
      jobData.spec.input_stage = {
        ref: jobData.inputs[inputKey],
        inputKey
      };

      console.info("SELECTED", jobData.spec.input_stage);
      return {
        currentNode: job,
        currentNodeInputs: jobData.inputs
      };
    });
  }

  moveFocus = (newFocusId: string) =>
    this.updateStateForNewComponent(getNode(newFocusId));

  render() {
    return (
      <div id="anayses-item-page" className="centered l-flex">
        {!this.state.currentNode ? (
          <div>Loading</div>
        ) : (
          <span
            id="analysis-chain"
            className="l-fg3"
            style={{ display: "flex", alignItems: "center" }}
          >
            {this.state.prevNodesDepth1 ? (
              <React.Fragment>
                <div
                  // onClick={() => this.moveFocus(this.state.prevNodesDepth1)}
                  className={`side-item-wrap before ${
                    this.state.hasMoreBefore ? "more" : ""
                  } ${this.state.highlightPrevious ? "highlight" : ""}`}
                  style={{ position: "relative" }}
                >
                  <div style={{ flexDirection: "column" }}>
                    <div className="analysis-item">
                      {Object.keys(this.state.prevNodesDepth1).map(id => (
                        <div
                          className="card shadow1 clickable"
                          key={id}
                          onClick={() => this.moveFocus(id)}
                        >
                          <div className="header column">
                            <h4>{getNode(id).description.title}</h4>
                            <div className="subheader">
                              <SanitizeHtml
                                html={getNode(id).description.subtitle}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <i className="link" data-tip="hello world" />
                </div>
              </React.Fragment>
            ) : (
              <div className={`side-item-wrap before`}>
                <button
                  disabled={!this.state.currentNodeInputs}
                  className="icon-button"
                  onClick={() =>
                    Router.push({
                      pathname: "/share",
                      query: {
                        referrer: this.state.currentNode.jobID,
                        link_type: link_type_enum.input
                      }
                    })
                  }
                >
                  <i className="material-icons">add_circle_outline</i>
                </button>
              </div>
            )}
            <div className="center-item-wrap">
              <div className="analysis-item">
                <div
                  className="row header"
                  style={{ marginTop: 0, display: "flex" }}
                >
                  <div className="description">
                    <div className="title">
                      <h2>{this.state.currentNodeDescription.title}</h2>
                      <button
                        style={{ cursor: "pointer" }}
                        className="icon-button"
                        onClick={() =>
                          this.setState((old: state) => ({
                            expanded: !old.expanded
                          }))
                        }
                      >
                        <i className="fas fa-sliders-h"></i>
                      </button>
                    </div>

                    {this.state.currentNodeDescription.subtitle ? (
                      <div className="subheader">
                        <SanitizeHtml
                          html={this.state.currentNodeDescription.subtitle}
                        />
                        <button
                          className="icon-button"
                          onClick={() =>
                            this.setState((old: state) => ({
                              expanded: !old.expanded
                            }))
                          }
                        >
                          <i
                            className={`material-icons ${
                              this.state.expanded ? "rotate-180" : null
                            }`}
                            aria-label="details"
                          >
                            expand_more
                          </i>
                        </button>
                      </div>
                    ) : null}
                    <span
                      style={{
                        display: this.state.expanded ? "initial" : "none"
                      }}
                    >
                      <div className="subheader">
                        <a
                          href={
                            this.state.currentNodeDescription.authorGithubLink
                          }
                        >
                          <b>{this.state.currentNodeDescription.author}</b>
                        </a>
                      </div>
                      <div className="subheader">
                        <a href={this.state.currentNodeDescription.githubLink}>
                          <b>Project Github Link</b>
                        </a>
                      </div>
                      <div className="subheader">
                        <a href={this.state.currentNodeDescription.dockerUrl}>
                          <b>Dockerfile</b>
                        </a>
                      </div>
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    flexDirection: "column"
                  }}
                >
                  <div className="card shadow1">
                    {!this.state.currentNodeInputs ? (
                      "No inputs"
                    ) : isSubmitted(this.state.currentNode) ? (
                      <JobProgress node={this.state.currentNode} />
                    ) : this.state.currentNodeSpec.input_stage.ref.spec
                        .category == "assembly" ? (
                      <GenomeSelector
                        species={
                          this.state.currentNodeSpec.input_stage.ref.spec.schema
                            .species as any
                        }
                        assemblies={
                          this.state.currentNodeSpec.input_stage.ref.spec.schema
                            .assemblies
                        }
                        onSelected={assembly =>
                          this.handleInputSelected(
                            this.state.currentNodeSpec.input_stage.ref,
                            assembly
                          )
                        }
                      />
                    ) : this.state.currentNodeSpec.input_stage.ref.spec.type ===
                      "file" ? (
                      <React.Fragment>
                        <div className="column">
                          <h3>
                            {
                              this.state.currentNodeSpec.input_stage.ref
                                .description.title
                            }
                          </h3>
                          <div className="subheader">
                            <SanitizeHtml
                              html={
                                this.state.currentNodeSpec.input_stage.ref
                                  .description.subtitle
                              }
                            />
                          </div>
                        </div>

                        <div className="content">
                          {this.state.currentNodeSpec.input_stage.ref.value !==
                          null ? (
                            this.state.currentNodeSpec.input_stage.ref.value
                              .ref ? (
                              <div className="row">
                                <ol>
                                  <li>
                                    {"1. "}
                                    <a
                                      className="link-component "
                                      href="#"
                                      onMouseOver={() =>
                                        this.setState(() => ({
                                          highlightPrevious: true
                                        }))
                                      }
                                      onMouseLeave={() =>
                                        this.setState(() => ({
                                          highlightPrevious: false
                                        }))
                                      }
                                      onClick={() =>
                                        this.moveFocus(
                                          this.state.currentNodeSpec.input_stage
                                            .ref.value.ref
                                        )
                                      }
                                    >
                                      {
                                        this.state.currentNodeSpec.input_stage
                                          .ref.value.ref
                                      }
                                      /outputs/
                                      {
                                        this.state.currentNodeSpec.input_stage
                                          .ref.value.outputKey
                                      }
                                    </a>
                                    <button
                                      className="icon-button"
                                      onClick={() =>
                                        this.removeLink(
                                          this.state.currentNodeSpec.input_stage
                                            .inputKey
                                        )
                                      }
                                    >
                                      <i
                                        className="material-icons"
                                        aria-label="cancel"
                                      >
                                        cancel
                                      </i>
                                    </button>
                                  </li>
                                </ol>
                              </div>
                            ) : null
                          ) : (
                            <div
                              className="row centered"
                              style={{
                                width: 150,
                                justifyContent: "space-around",
                                alignItems: "center"
                              }}
                            >
                              <button className="icon-button">
                                <i className="material-icons">cloud_upload</i>
                              </button>
                              <span>or</span>
                              <button className="icon-button">
                                <i
                                  className="material-icons"
                                  onClick={() =>
                                    Router.push({
                                      pathname: "/share",
                                      query: {
                                        referrer: this.state.currentNode.jobID,
                                        link_type: link_type_enum.input
                                      }
                                    })
                                  }
                                >
                                  link
                                </i>
                              </button>
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    ) : null}
                  </div>
                  <div
                    id="submission-controls"
                    style={{ justifyContent: "center" }}
                  >
                    {/* <button
                      className="icon-button"
                      disabled={!this.state.prevNodesDepth1}
                      onClick={() =>
                        this.moveFocus(
                          Object.keys(this.state.prevNodesDepth1)[0]
                        )
                      }
                    >
                      <i className="material-icons">keyboard_arrow_left</i>
                    </button> */}

                    <button
                      className="icon-button"
                      disabled={
                        !this.state.currentNodeInputCompleted ||
                        runningOrSubmitted(this.state.currentNode)
                      }
                      onClick={() => this.submit(this.state.currentNode)}
                    >
                      <i className="material-icons">directions_run</i>
                    </button>

                    {/* <button
                      className="icon-button"
                      disabled={!this.state.nextNodesDepth1}
                      onClick={() =>
                        this.moveFocus(
                          Object.keys(this.state.nextNodesDepth1)[0]
                        )
                      }
                    >
                      <i className="material-icons">keyboard_arrow_right</i>
                    </button> */}
                  </div>
                </span>
              </div>
            </div>
            {(this.state.nextNodesDepth1 && (
              <div
                className={`side-item-wrap after ${
                  this.state.hasMoreAfter ? "more" : ""
                }`}
              >
                <i className="link" />
                <React.Fragment>
                  <div className="analysis-item">
                    {Object.keys(this.state.nextNodesDepth1).map(id => (
                      <div
                        className="card shadow1 clickable"
                        key={id}
                        onClick={() => this.moveFocus(id)}
                      >
                        <div className="header column">
                          <h4>{getNode(id).description.title}</h4>
                          <div className="subheader">
                            <SanitizeHtml
                              html={getNode(id).description.subtitle}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </React.Fragment>
                {/* <div
                  className="analysis-item"
                  onClick={() => this.moveFocus(1)}
                >
                  <div className="card shadow1 clickable">
                    <div className="header column">
                      <h4>
                        {this.state.nextNodesDepth1.description.title}
                      </h4>
                      <div className="subheader">
                        <SanitizeHtml
                          html={
                            this.state.nextNodesDepth1.description.subtitle
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div> */}
              </div>
            )) || (
              <div className={`side-item-wrap after`}>
                <button
                  className="icon-button"
                  onClick={() =>
                    Router.push({
                      pathname: "/share",
                      query: {
                        referrer: this.state.currentNode.jobID,
                        link_type: link_type_enum.output
                      }
                    })
                  }
                >
                  <i className="material-icons">add_circle_outline</i>
                </button>
              </div>
            )}
          </span>
        )}
      </div>
    );
  }
}

export default withRouter(Item);

//SNIPPETS
{
  /* <div
  className={`side-item-wrap stacked-cards before ${
    this.state.hasMoreBefore ? "more" : ""
  } ${this.state.highlightPrevious ? "highlight" : ""}`}
>
  <div className="container">
    <div className="card-stack">
      <a className="buttons prev" href="#"></a>
      <ul className="card-list">
        <li
          className="card shadow1"
          style={{ backgroundColor: "#4CD964" }}
        ></li>
        <li
          className="card shadow1"
          style={{ backgroundColor: "#FFCC00" }}
        ></li>
        <li
          className="card shadow1"
          style={{ backgroundColor: "#FF3B30" }}
        ></li>
        <li
          className="card shadow1"
          style={{ backgroundColor: "#34AADC" }}
        ></li>
        <li
          className="card shadow1"
          style={{ backgroundColor: "#FF9500" }}
        ></li>
      </ul>
      <a className="buttons next" href="#"></a>
    </div>
  </div>
</div>; */
}
