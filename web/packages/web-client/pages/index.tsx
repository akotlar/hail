import React, { memo } from "react";
import "styles/pages/index.scss";
import DefaultView from '../components/DefaultView/DefaultView';

const index = memo(() => (
  <div id="index" className="centered">
    <h1>
      <a href="https://github.com/akotlar/bystro" target="_blank">
        Bystro
      </a>
    </h1>
    <div className="subtitle">Genomic analysis for any size data</div>

    <p>
      <DefaultView />
    </p>
  </div >
));

export default index;
