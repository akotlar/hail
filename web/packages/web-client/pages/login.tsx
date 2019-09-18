import { PureComponent, createRef } from 'react';
// import { login } from '../libs/auth';
import '../styles/pages/login.scss';
import '../styles/card.scss';
import 'isomorphic-unfetch';
import { initIdTokenHandler, TokenInterface } from '../libs/auth';

import getConfig from "next/config";

const url = getConfig().publicRuntimeConfig.API.BASE_URL;
// import { Formik } from 'formik';

declare type state = {
  loggedIn?: boolean;
  failed?: boolean;
  email?: any;
  password?: any;

};

interface LoginProps {
  redirected: boolean;
}

class Login extends PureComponent<LoginProps> {
  state: state = {
    email: createRef(),
    password: createRef()
  };

  constructor(props: any) {
    super(props);
  }

  onLoginButtonClick = async (email, password) => {
    console.info("called");

    const tokenHandler: TokenInterface = initIdTokenHandler();

    fetch(`${url}/user/auth/local`, {
      method: "POST",
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      }, body: JSON.stringify(
        { email, password }
      )
    })
      .then(r => r.json())
      .then(data => {
        console.info("data", data);
        tokenHandler.setTokenFromJSON(data);
        console.info("token is", tokenHandler.token)
      })
      .catch(e => {
        console.info(e.message);
        console.info("failed to fetch", e.message);
      });


  };

  onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      password: e.target.value
    });
  };

  handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    this.onLoginButtonClick(this.state.email.current.value, this.state.password.current.value);
  }

  // render() {
  //   return (
  //     <span id="login" className="centered">
  //       {this.state.failed ? (
  //         <div>Unauthorized!</div>
  //       ) : (
  //           <Fragment>
  //             <h3>Login</h3>
  //             <span id="login-choices">
  //               <button
  //                 className="outlined-button"
  //                 onClick={this.onLoginButtonClick}
  //               >
  //                 Login
  //             </button>
  //               <span id="separator">or</span>
  //               <form onSubmit={this.onSubmit}>
  //                 <input
  //                   type="password"
  //                   onChange={this.onChange}
  //                   placeholder="Enter the workshop password"
  //                 />
  //               </form>
  //             </span>
  //           </Fragment>
  //         )}
  //     </span>
  //   );
  // }

  // md-card class='narrow-form center'
  //   ng-if='loginCtrl.message'>
  //   <md-card-title>
  //     <md-card-title-text>
  //       <h5 class='error'>Log in to view this page</h5>
  //       <!--ng-bind='::loginCtrl.message' -->
  //     </md-card-title-text>
  //   </md-card-title>

  // </md-card>

  render() {
    return (
      <div id='login-page' className='centered'>
        <div className='card shadow1'>
          <div className='header'><h4>Log In</h4></div>
          <form className='content' onSubmit={this.handleSubmit}>
            <input type='text' placeholder='email' ref={this.state.email} value='seqantpaper@gmail.com' />
            <input type='password' placeholder='password' ref={this.state.password} value='seqantgenetics' />
            <div className='row' style={{ marginTop: '10px', alignItems: 'center', justifyContent: 'center' }}>
              <button >Log In</button>
              <a href='#' style={{ marginLeft: '1rem' }}>Sign up</a>
            </div>
          </form>
        </div>
      </div >)
  }
}

export default Login;
