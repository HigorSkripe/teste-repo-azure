const path = require('path')
const webpackCommonConfig = require('./webpack.common')

module.exports = {
  ...webpackCommonConfig,
  mode: 'development',
  devServer: {
    contentBase: path.join(__dirname, '../dist'),
    compress: false,
    port: 3000,
    overlay: true,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers':
        'X-Requested-With, content-type, Authorization'
    }
  }
}
