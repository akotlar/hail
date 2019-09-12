require('dotenv').config();

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const withPurgeCss = require('next-purgecss');
const withCss = require('@zeit/next-css');
const withSass = require('@zeit/next-sass');
const withSize = require('next-size');

const publicRuntimeConfig = {
  AUTH0: {
    DOMAIN: process.env.AUTH0_DOMAIN,
    SCOPE: process.env.AUTH0_SCOPE,
    CALLBACK_SUFFIX: process.env.AUTH0_CALLBACK_SUFFIX,
    RESPONSE_TYPE: process.env.AUTH0_RESPONSE_TYPE,
    CLIENT_ID: process.env.AUTH0_CLIENT_ID,
    AUDIENCE: process.env.AUTH0_AUDIENCE
  },
  HAIL: {
    DOMAIN: process.env.HAIL_DOMAIN
  },
  SCORECARD: {
    WEB_URL: process.env.SCORECARD_WEB_URL,
    SERVER_URL: process.env.SCORECARD_SERVER_URL || process.env.SCORECARD_WEB_URL,
    USERS: process.env.SCORECARD_USERS ?
      process.env.SCORECARD_USERS.split(',') : []
  },
  NOTEBOOK: {
    URL: process.env.NOTEBOOK_URL,
    IMAGE: process.env.NOTEBOOK_IMAGE
  }
};

const nextConfig = {
  distDir: 'build',
  purgeCss: {
    keyframes: true,
    fontFace: true
  },
  // Specify which files should be checked for selectors before deciding some imported css is not used:
  purgeCssPaths: ['pages/**/*', 'components/**/*'],
  webpack: (config, options) => {
    if (options.isServer) {
      config.plugins.push(new ForkTsCheckerWebpackPlugin());
    } else if (!options.dev) {
      // Only in a production environment, in the client-side webpack phase
      // does next configure splitChuunks
      // In practice this happens during "next build", and we don't care about
      // optimizing chunk settings during dev
      config.optimization.splitChunks.cacheGroups.commons.minChunks = 2;
    }

    return config;
  },
  publicRuntimeConfig
};

module.exports = withSize(withSass(withCss(withPurgeCss(nextConfig))));