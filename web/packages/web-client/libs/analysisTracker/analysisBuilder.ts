import { isMatch } from "lodash";
import {
  addCallback as addSocketioCallback,
  events as socketioEvents
} from "../../libs/socketio";
import { initIdTokenHandler } from "../../libs/auth";
import fetch from "isomorphic-unfetch";

type events = {
  submitted: string;
  started: string;
  failed: string;
  completed: string;
  progress: string;
};

export const batchEvents: events = {
  submitted: "batchSubmitted",
  started: "batchStarted",
  failed: "batchFailed",
  completed: "batchCompleted",
  progress: "batchProgress"
};

export const batchStates = {
  notSubmitted: "not_submitted",
  started: "started",
  failed: "failed",
  completed: "completed",
  queued: "queued"
};

const uuidv4 = require("uuid/v4");

let batchID = uuidv4();

function _setSocketIOlisteners(socket: any) {
  console.info("setting socket io listeners in item.tsx");

  // _removeListeners(socket);

  socket.on(batchEvents.submitted, data => {
    console.info("received batch submitted event in item.tsx", data);
    // _forward(events.annotation.submitted, data, _updateJob);
  });

  socket.on(batchEvents.started, data => {
    console.info("received batch started event in item.tsx", data);
    // _forward(events.annotation.submitted, data, _updateJob);
  });

  socket.on(batchEvents.failed, data => {
    console.info("received batch failed event in item.tsx", data);
    // _forward(events.annotation.submitted, data, _updateJob);
  });

  socket.on(batchEvents.completed, data => {
    console.info("received batch completed event in item.tsx", data);
    // _forward(events.annotation.submitted, data, _updateJob);
  });

  socket.on(batchEvents.progress, data => {
    console.info("received batch deleted event in item.tsx", data);
    // _forward(events.annotation.submitted, data, _updateJob);
  });
}

if (typeof window !== "undefined") {
  console.info("ADDING socket listeners");
  addSocketioCallback(socketioEvents.connected, socket => {
    console.info("ADDING SOCKET LISTENERS");
    _setSocketIOlisteners(socket);
  });
}

export type analysisItem = {
  next?: linkedNode;
  previous?: linkedNode;
  submission: any;
  parameters: any;
  outputs: any;
  inputs: any;
  spec: any;
  batchjobID: string;
  jobID: string;
  id?: string;
  description: any;
};

export type linkedNodeDetails = {
  jobID: string;
  // These should have compatible dimensions,
  // either identical, or 1
  // in future, allow broadcast
  outputKeys: string[];
  inputKeys: string[];
};

export type linkedNode = {
  [jobID: string]: linkedNodeDetails;
};

type analyses = {
  [jobID: string]: analysisItem;
};

let allNodes: analyses = {};

export let totalNodeSteps: number = 0;

export const isSubmitted = (node: any) => {
  return node.submission.state !== "not_submitted";
};

export const isFailed = (node: any) => {
  return node.submission.state === "failed";
};

export const isCompleted = (node: any) => {
  return node.submission.state === "completed";
};

export const isStarted = (node: any) => {
  return node.submission.state === "started";
};

export const runningOrCompleted = (node: any) => {
  return (
    node.submission.state === "started" || node.submission.state === "completed"
  );
};

export const completed = (node: any) => {
  return node.submission.state === "completed";
};

export const failed = (node: any) => {
  return node.submission.state === "failed";
};

export const runningOrSubmitted = (node: any) => {
  return (
    node.submission.state !== batchStates.notSubmitted &&
    node.submission.state !== batchStates.failed
  );
};

export const getNode = (jobID: string) => allNodes[jobID];

export const cloneAndAddNode = (item: any): analysisItem => {
  totalNodeSteps += 1;

  // TODO: avoid JSON.parse, use known schema to clone fast
  const newComponent = munge(JSON.parse(JSON.stringify(item)));

  newComponent.jobID = uuidv4();

  newComponent.batchID = batchID;
  newComponent.jobID = uuidv4();
  // don't have a db entry
  newComponent._creator = newComponent.id;
  newComponent.id = null;

  if (!allNodes[newComponent.jobID]) {
    allNodes[newComponent.jobID] = newComponent;
  }

  return allNodes[newComponent.jobID];
};

export const linkHasPreviousNodes = (link: linkedNode) =>
  Object.keys(link).some(id => getNode(id).previous);
export const linkHasNextNodes = (link: linkedNode) => {
  Object.keys(link).forEach(id => {
    const has = getNode(id).next;

    console.info("has?", id, has, link);
  });

  return Object.keys(link).some(id => getNode(id).next);
};

export const getPrevNode = (
  currentNode: analysisItem,
  jobID: string
): linkedNodeDetails => {
  if (!currentNode.previous) {
    return null;
  }

  return currentNode.previous[jobID];
};

export const getNextNode = (
  currentNode: analysisItem,
  jobID: string
): linkedNodeDetails => {
  if (!currentNode.next) {
    return null;
  }

  return currentNode.next[jobID];
};

export const getPrevNodes = (currentNode: analysisItem): linkedNode => {
  if (!currentNode.previous) {
    return null;
  }

  return currentNode.previous;
};

export const getNextNodes = (currentNode: analysisItem): linkedNode => {
  if (!currentNode.next) {
    return null;
  }

  return currentNode.next;
};

export type inputRefValue = string;

export const checkInputsCompleted = (item: analysisItem): boolean => {
  console.info("CHECKING", item);
  if (!item.inputs) {
    return true;
  }

  const res = Object.values(item.inputs).every(
    (input: any) => input.value !== null && input.value !== undefined
  );

  console.info("checkInputsCompleted result: ", res);

  if (res === true) {
    const lastInputKey =
      item.spec.input_order[item.spec.input_order.length - 1];
    item.spec.input_stage = {
      ref: item.inputs[lastInputKey],
      inputKey: lastInputKey
    };

    item.spec.input_stage_idx = item.spec.input_order.length - 1;
    item.spec.input_completed = true;

    console.info("item.spec.input_stage new", item.spec.input_stage);
  }
  return res;
};

// TODO: Change to all nodes?
export const submit = (
  currentNode: analysisItem,
  onSubmitted: (node) => void
) => {
  // return new Promise((resolve, reject) => {
  // if (!checkInputsCompleted(currentNode)) {
  //   return reject(new Error("Node isn't fully configured yet"));
  // }
  const auth = initIdTokenHandler();

  // console.info("curretnode in submt", currentNode);
  // console.info("all nodes", getNodes());

  // const toSubmit = {
  //   currentNodejobID: currentNode.jobID,
  //   nodes: getNodes()
  // };

  if (!checkInputsCompleted(currentNode)) {
    return Promise.reject("Node isn't fully configured yet");
  }
  console.info("GET NODES", getNodes());
  const toSubmit = {
    currentNodeJobID: currentNode.jobID,
    nodes: getNodes()
  };

  currentNode.submission.state = "submitted";

  console.info("I'm submitting", toSubmit);

  onSubmitted(currentNode);
  return (
    fetch("/api/jobs/create", {
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      // mode: 'cors', // no-cors, *cors, same-origin
      // cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: "same-origin", // include, *same-origin, omit
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.getToken()}`
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      // redirect: 'follow', // manual, *follow, error
      // referrer: 'no-referrer', // no-referrer, *client
      body: JSON.stringify(toSubmit) // body data type must match "Content-Type" header
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }

        return response.json();
      })
      // TODO: only resolve if return status is 2xx
      .then(jobsArray => {
        // TODO: do this for every id returned

        jobsArray.forEach(job => {
          allNodes[job.jobID] = Object.assign(allNodes[job.jobID], job);
        });

        return currentNode;
      })
      .catch(err => {
        currentNode.submission.state = "not_submitted";
        currentNode.submission.submission_error = "Internal Server Error";

        console.info("ERRR in abuilder", currentNode);
        throw err;
      })
  );
};

function checkAssembliesCompatibleSetIfMissing(
  item: any,
  inputAssembly: any,
  outputAssembly: any
) {
  const requiredAssembly = outputAssembly.value;

  let iAssembly;
  if (
    inputAssembly.value !== null &&
    typeof inputAssembly === "object" &&
    inputAssembly.ref
  ) {
    iAssembly = extractRefPath(allNodes, item, inputAssembly.ref);
  } else {
    iAssembly = inputAssembly.value;
  }

  if (iAssembly[0] === null || iAssembly[0].value === null) {
    for (let i = 0; i < iAssembly[0].spec.schema.length; i++) {
      const entry = iAssembly[0].spec.schema[i];
      console.info("Entry", entry);
      const specie = entry.specie;
      const assemblies = entry.assemblies;

      console.info("specie", specie, assemblies);

      if (assemblies[requiredAssembly]) {
        iAssembly[0].value = assemblies[requiredAssembly].value;

        console.info("NOW!", iAssembly);
        return true;
      }

      return false;
    }
    console.info("Not found", outputAssembly);
    return false;
  }
  console.info("iAssembly[0]", iAssembly[0]);
  if (iAssembly[0].value === outputAssembly.value) {
    return true;
  }

  return false;
}

export const getNodeFromRef = (node: analysisItem, ref: string) => {
  const [, wholeJob] = extractRefPath(allNodes, node, ref);

  console.info("job", wholeJob);
  return wholeJob;
};

function extractRefPath(allNodes, node, ref: string) {
  console.info("ref", ref);
  const splitRef = ref.split("/");

  let job;
  let i = 0;
  let path = [];
  let wholeJob: analysisItem;
  splitRef.forEach(v => {
    if (i == 0) {
      if (splitRef[0] === "#") {
        job = node;
      } else {
        job = allNodes[splitRef[0]];
      }

      wholeJob = job;
      i += 1;
      return;
    }

    job = job[v];
    path.push(v);
  });

  return [job, wholeJob, path];
}

export const removeLinkByInput = (
  item: analysisItem,
  inputKey: string
): analysisItem => {
  console.info("Removing", inputKey);
  const itemInput = item.inputs[inputKey];
  const refValue: inputRefValue = itemInput.value;

  const [, referredToItem, path] = extractRefPath(allNodes, item, refValue);
  const previousID = referredToItem.id;
  // const refKey = refValue.outputKey;

  if (path[1] !== "outputs") {
    throw new Error("expected ref to contain `outputs` key after node id");
  }
  const refKey = path[2];

  console.info("ref", refValue, previousID);

  if (!item.previous) {
    throw new Error("Item must have previous links");
  }

  const previous = item.previous[previousID];
  const previousNode = getNode(previous.jobID);
  const previousNext = previousNode.next;

  if (!(previous && previousNext)) {
    throw new Error(`Couldn't find previous id ${previousID}`);
  }
  console.info(item);
  const previousNextLinkToItem = previousNext[item.jobID];

  console.info("previous", previousNode);

  console.info("previous next", previousNext);
  if (!previousNextLinkToItem) {
    throw new Error(
      `Couldn't find link from previous node to current id ${item.jobID}`
    );
  }

  const prevKeyIndex = previous.outputKeys.indexOf(refKey);
  console.info("refKey", refKey);
  if (prevKeyIndex === -1) {
    throw new Error(`Couldn't find output key ${refKey}`);
  }

  if (prevKeyIndex == 0 && previous.outputKeys.length == 1) {
    // Can totally remove the link
    item.previous = null;
  } else {
    previous.outputKeys.splice(prevKeyIndex, 1);
    previous.inputKeys.splice(prevKeyIndex, 1);
  }

  console.info(prevKeyIndex);

  const prevNextKeyIndex = previousNextLinkToItem.outputKeys.indexOf(refKey);

  if (prevNextKeyIndex === -1) {
    throw new Error(`Couldn't find input key for following node ${refKey}`);
  }

  if (prevNextKeyIndex == 0 && previousNextLinkToItem.outputKeys.length == 1) {
    // Can totally remove the link
    previousNode.next = null;
  } else {
    previousNextLinkToItem.outputKeys.splice(prevNextKeyIndex, 1);
    previousNextLinkToItem.inputKeys.splice(prevNextKeyIndex, 1);
  }

  itemInput.value = null;

  if (item.spec.input_stage_idx > 0) {
    item.spec.input_stage_idx -= 1;
  }

  if (itemInput.spec.assembly) {
    if (itemInput.spec.assembly.ref) {
      const iAssembly = extractRefPath(
        allNodes,
        item,
        itemInput.spec.assembly.ref
      );
      iAssembly[0].value = null;

      console.info("after", iAssembly);
    }
  }

  console.info("input stage idx", item.spec.input_stage_idx);
  const inputStageKey = item.spec.input_order[item.spec.input_stage_idx];

  item.spec.input_stage = {
    inputKey: inputStageKey,
    ref: item.inputs[inputStageKey]
  };

  totalNodeSteps -= 1;

  return item;
  // console.info('prevKey after remove node', prev)
};

export const removeNextNode = (
  currentItem: analysisItem,
  id: string
): analysisItem => {
  // let directToRemoveCount = Object.keys(currentItem.next);

  // Object.keys(currentItem.next).forEach()

  delete currentItem.next[id];

  if (Object.keys(currentItem.next).length == 0) {
    currentItem.next = null;
  }

  totalNodeSteps -= 1;

  return currentItem;
};

export const removePreviousNode = (
  currentItem: analysisItem,
  id: string
): analysisItem => {
  currentItem.previous[id].inputKeys.forEach(inputKey => {
    console.info("deleting from", currentItem, id);
    removeLinkByInput(currentItem, inputKey);
  });

  if (!currentItem.previous) {
    return currentItem;
  }

  delete currentItem.previous[id];

  if (Object.keys(currentItem.previous).length == 0) {
    currentItem.previous = null;
  }

  return currentItem;
};

// export const hasMorePrevious = ()
// TODO
// For file types that contain schemas (i.e vcf)
// validate the assembly
export const linkNodes = (
  leftItem: analysisItem,
  rightItem: analysisItem
): any => {
  console.info("left, right", leftItem, rightItem);
  for (const outputKey in leftItem.outputs) {
    const output = leftItem.outputs[outputKey];
    const outputType = output.spec.type;

    // leftItem.rightInputsConfigured = [];

    let linked = false;
    for (const inputKey in rightItem.inputs) {
      const currentInput = rightItem.inputs[inputKey];
      const inputType = currentInput.spec.type;

      console.info(
        "before",
        inputType,
        outputType,
        inputType === outputType,
        leftItem,
        rightItem
      );
      if (inputType === outputType) {
        console.info("in");
        if (currentInput.spec.category !== output.spec.category) {
          continue;
        }
        console.info("past", currentInput);

        // vcf files have assemblies
        if (currentInput.spec.category === "vcf") {
          console.info("vcf");
          const schemaIn = currentInput.spec.schema;
          const schemaOut = output.spec.schema;

          const assembliesCompatible = checkAssembliesCompatibleSetIfMissing(
            rightItem,
            currentInput.spec.assembly,
            output.spec.assembly
          );

          console.info("right item", rightItem);

          console.info(
            "schemaIn",
            schemaIn,
            "out",
            schemaOut,
            "compatible assemblies",
            assembliesCompatible
          );

          // The schema coming from the preceeding component must be equal, or a superset
          // of the current component, which it will be serving
          if (
            !assembliesCompatible ||
            (schemaIn !== "any" && !isMatch(schemaOut, schemaIn))
          ) {
            throw new Error("Incompatible");
          }
        }

        // Means the ref can be filled with the value now, no need to
        rightItem.inputs[inputKey].value = {
          ref: `${leftItem.jobID}/outputs/${outputKey}`
        };

        console.info("outputkey is", rightItem.inputs[inputKey].value);

        if (!linked) {
          if (!rightItem.previous) {
            rightItem.previous = {};
          }

          rightItem.previous[leftItem.jobID] = {
            jobID: leftItem.jobID,
            inputKeys: [inputKey],
            outputKeys: [outputKey]
          };

          if (!leftItem.next) {
            leftItem.next = {};
          }

          leftItem.next[rightItem.jobID] = {
            jobID: rightItem.jobID,
            inputKeys: [inputKey],
            outputKeys: [outputKey]
          };

          linked = true;

          continue;
        }

        rightItem.previous[leftItem.jobID].inputKeys.push(inputKey);
        rightItem.previous[leftItem.jobID].outputKeys.push(outputKey);

        leftItem.next[rightItem.jobID].inputKeys.push(inputKey);
        leftItem.next[rightItem.jobID].outputKeys.push(outputKey);
      }
    }

    if (!linked) {
      throw new Error("Incompatible");
    }
  }

  console.info("compatible", rightItem);

  return rightItem;
};

// TODO: prevent removal if it links to anything
export const removeNode = (
  currentItem: analysisItem,
  itemItDependsOn: analysisItem
) => {
  delete currentItem[itemItDependsOn.jobID];
  delete itemItDependsOn[currentItem.jobID];
};

export const clearNodes = () => {
  allNodes = {};
  batchID = uuidv4();
};

export const getNodes = () => allNodes;

export const getNodeCount = () => Object.keys(allNodes).length;

function munge(data): any {
  // console.info("DATA", data);
  if (data.inputs) {
    if (!data.spec.input_order) {
      data.spec.input_order = Object.keys(data.inputs).sort();
    }

    const inputKey = data.spec.input_order[0];

    data.spec.input_stage = {
      ref: data.inputs[inputKey],
      inputKey
    };

    data.spec.input_stage_idx = 0;
    data.spec.input_completed = false;
  }

  return data;
}
