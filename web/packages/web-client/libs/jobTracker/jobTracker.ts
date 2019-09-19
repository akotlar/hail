import fetch from "isomorphic-unfetch";
import Callbacks from "../callbacks";
import getConfig from "next/config";
import { initIdTokenHandler, addCallback as addAuthCallback, loggedInEventName, loggedOutEventName } from "../auth"

// const controller = new AbortController();
// const signal = controller.signal;

const url = getConfig().publicRuntimeConfig.API.BASE_URL;

// enum types {
//   "all" = "all",
//   "public" = "public"
// }

export type JobType = {
  name: string,
  updatedAt: string,
  createdAt: string,
  submission: {
    submittedDate: string,
    type: string,
    _id: string,
    addedFileNames: string[],
    log: object[],
    attempts: number,
    state: string,
    queueID: string,
    startedDate: string,
    finishedDate: string,
  },
  userID: string,
  assembly: string,
  email: string,
  inputFileName: string,
  outputBaseFileName: string,
  expireDate: Date,
  visibility: string,
  type: string,
  options: { index: boolean },
  search: object[],
  config: string,
  _id: string,
}

const data: { [type: string]: JobType[] } = {
  all: [],
  completed: [],
  public: []
}

const clearData = () => {
  data['all'] = [];
  data['completed'] = [];
  data['public'] = [];

  callbacks.call('all', data['all']);
  callbacks.call('completed', data['completed'])
  callbacks.call('public', data['public']);
}
// let _all = {};
// let _completed: job[] = [];
// // let _incomplete = {};
// // let _failed = {};
// // let _deleted = {};
// let _public: job[] = [];
// let _shared = {};



const callbacks = new Callbacks({
  public: [],
  all: [],
  completed: [],
  shared: [],
  deleted: [],
  failed: []
});

export function addCallback(type: string, action: (data: JobType[]) => void): number {
  const id = callbacks.add(type, action);

  action(data[type]);

  return id;
};

export const removeCallback = callbacks.remove;

export default {
  get all() {
    return data.all;
  },
  get public() {
    return data.public;
  },
  get completed() {
    return data.completed;
  }
};

let _fetchPromise = null;
async function _preload(token?: string) {
  if (_fetchPromise) {
    console.info('have');
    return Promise.all(_fetchPromise)
  }
  // async function _preload({ signal }: any = {}) {
  if (!token) {
    const auth = initIdTokenHandler();
    token = auth.token;
  }

  _fetchPromise = [['completed', 'completed'], ['public', 'all/public']].map(async obj => {
    try {
      const resData = await fetch(`${url}/jobs/list/${obj[1]}`, {
        headers: {
          'Authorization': 'Bearer ' + token,
        }
      })
        .then(r => r.json());

      data[obj[0]] = resData;
      callbacks.call(obj[0], data[obj[0]]);
    } catch (e) {
      console.info("caught");
      console.error(e);
    }

    _fetchPromise = null;
  });

  return Promise.all(_fetchPromise);
}

// async function _preload2 {
//   if (typeof window !== 'undefined') {
//     const auth = initIdTokenHandler();
//     const token = auth.token;

//     console.info('the token', token);

//     fetch(`${ url } / jobs / list / all / public`, {
//       credentials: "include"
//     })
//       .then(r => r.json())
//       .then(data => {
//         _public = data;
//         callbacks.call("public", data);
//       })
//       .catch(e => {
//         console.info(e.message);
//         console.info("failed to fetch", e.message);
//       });

//     fetch(`${ url } / jobs / list / completed`, {
//       method: "GET",
//       headers: {
//         'Authorization': 'Bearer ' + token,
//       }
//     })
//       .then(r => r.json())
//       .then(data => {
//         _completed = data;
//         callbacks.call("completed", data);
//       })
//       .catch(e => {
//         console.info(e.message);
//         console.info("failed to fetch", e.message);
//       });
//   }
// }

if (typeof window !== 'undefined') {
  addAuthCallback(loggedInEventName, (data) => {
    console.info("calling");
    _preload(data[1]);
  });

  addAuthCallback(loggedOutEventName, () => {
    clearData();
  });
}

export function preload() {
  return _preload();
}

