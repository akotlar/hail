import { PureComponent } from 'react';
import fetch from 'isomorphic-unfetch';
import getConfig from 'next/config';
import Link from 'next/link';
import { PR, Issue } from '../@types/scorecard';

import '../styles/pages/scorecard.scss';

const config = getConfig().publicRuntimeConfig.SCORECARD;

// We separate these because in some environments (i.e kubernetes)
// there may be an internal DNS we can take advantage of
const WEB_URL: string = config.WEB_URL;
const SERVER_URL: string = config.SERVER_URL;
const USERS: string[] = config.USERS;

if (!(USERS && WEB_URL && SERVER_URL)) {
  throw new Error(
    'Scorecard WEB_URL and SERVER_URL env variables required found'
  );
}

// TODO: This may be better represented using GraphQL
// buys us schema introspection and validation
// Typescript gives us only compile-time guarantees on the client

declare type scorecardJson = {
  user_data: {
    [name: string]: {
      CHANGES_REQUESTED: PR[];
      ISSUES: Issue[];
      NEEDS_REVIEW: PR[];
    };
  };
  unassigned: PR[];
  urgent_issues: [
    {
      AGE: string;
      ISSUE: Issue;
      USER: string;
    }
  ];
  updated: string;
};

declare type user = string;

interface State {
  data?: scorecardJson;
  user: user;
}

interface Props {
  pageProps: State;
}

// TODO: think about triggering this in _app.js
// or simply set an expiration, and then upon mount check if expiration
// is too stale
// An example of how we can cache events that can be slightly stale
// at some memory cost
// With the benefit that if refresh is smaller than the
// time between page clicks, non-stale state will be served in << 16ms on click
let cache: scorecardJson;

let cachePromise: Promise<any>;

let fetchData = () => {
  cachePromise = fetch(`${WEB_URL}/json`)
    .then(d => d.json())
    .then(data => {
      cache = data;
    });

  return cachePromise;
};

let timeout: NodeJS.Timeout;
const startPolling = (ms: number = 1 * 60 * 1000) => {
  if (timeout) {
    clearTimeout(timeout);
  }

  timeout = setInterval(fetchData, ms);
};

let user: string;
let initialized = false;

class Scorecard extends PureComponent<Props, State> {
  state = {
    user: user,
    data: cache
  };
  // Data that is fetched during the server rendering phase does not need
  // to be re-fetched during the client rendering phase
  // The data is automatically available under this.props.pageProps
  static refreshUser() {
    const seed = Math.floor(Math.random() * USERS.length);
    return USERS[seed];
  }

  static async getInitialProps() {
    user = Scorecard.refreshUser();

    // TODO: have a single utility function, that checks this once at startup
    // in each phase
    const onServer = typeof window === 'undefined';

    if (onServer) {
      fetchData();

      return;
    }

    startPolling();

    return null;
  }

  constructor(props: Props) {
    super(props);

    if (cache) {
      this.state.data = cache;
    }

    this.state.user = user;

    // Initialize state to props becaues we may mutate the state (say polling)
    // but props are supposed to be read-only
  }

  onComponenDidMountt() {
    if (initialized) {
    }
  }
  handleRefreshUser = () => {
    this.setState({ user: Scorecard.refreshUser() });
  };

  render() {
    if (!this.state.data) {
      return <div>No data</div>;
    }

    const { user_data, unassigned, urgent_issues, updated } = this.state.data;

    if (unassigned && unassigned.length) {
      user_data['UNASSIGNED'] = {
        NEEDS_REVIEW: unassigned,
        CHANGES_REQUESTED: [],
        ISSUES: []
      };
    }

    return (
      <span id="scorecard">
        <div className="issues-section">
          <h5>Nominal</h5>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Review</th>
                <th>Change</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(user_data).map((name, idx) => (
                <tr key={idx}>
                  <td>
                    <Link href={`/scorecard/user?name=${name}`}>
                      <a>{name}</a>
                    </Link>
                  </td>
                  <td>
                    {user_data[name].NEEDS_REVIEW.map((pr, i) => (
                      <a target="_blank" key={i} href={pr.html_url}>
                        {pr.id}
                      </a>
                    ))}
                  </td>
                  <td>
                    {user_data[name].CHANGES_REQUESTED.map((pr, i) => (
                      <a target="_blank" key={i} href={pr.html_url}>
                        {pr.id}
                      </a>
                    ))}
                  </td>
                  <td>
                    {user_data[name].ISSUES.map((pr, i) => (
                      <a target="_blank" key={i} href={pr.html_url}>
                        {pr.id}
                      </a>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {urgent_issues && (
          <div className="issues-section">
            <h5>Urgent !</h5>
            {
              <table>
                <thead>
                  <tr>
                    <th>Who</th>
                    <th>What</th>

                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {urgent_issues.map((issue, idx) => (
                    <tr key={idx}>
                      <td>
                        <Link href={`/scorecard/user?name=${issue.USER}`}>
                          <a>{issue.USER}</a>
                        </Link>
                      </td>

                      <td>
                        <a target="_blank" href={issue.ISSUE.html_url}>
                          {issue.ISSUE.title}
                        </a>
                      </td>
                      <td className="emph">{issue.AGE}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          </div>
        )}
        <div className="issues-section">
          <h5>Rolodex</h5>
          <div id="random-user">
            <img
              src={`https://github.com/${this.state.user}.png?size=50`}
              width="50"
              onClick={this.handleRefreshUser}
            />
            <span>{this.state.user}</span>
          </div>
        </div>
        <div className="issues-section deemph">Updated: {updated}</div>
      </span>
    );
  }
}

export default Scorecard;
