/* eslint-disable import/no-extraneous-dependencies */
const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: './src/koa',
  target: 'node',
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel',
        include: __dirname,
        exclude: /node_modules/,
      },
      { test: /\.json$/, loader: 'json-loader' },
    ],
  },
  output: {
    libraryTarget: 'commonjs',
    path: 'build',
    filename: 'koa.js', // this should match the first part of function handler in serverless.yml
  },
  externals: ['sharp', 'aws-sdk'],
  plugins: [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin({ minimize: true, sourceMap: false, warnings: false }),
  ],
}
