const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const DashboardPlugin = require('webpack-dashboard/plugin')
const { EnvironmentPlugin } = require('webpack')

module.exports = {
  entry: {
    preloader: ['./src/style.scss'],
    common_vendors: [
      '@babel/polyfill',
      'jquery/src/jquery',
      'jquery.maskedinput',
      'moment/dist/moment',
      'moment/dist/locale/pt-br',
      'bootstrap/dist/js/bootstrap',
      'sweetalert/dist/sweetalert-dev',
      'd3/d3.min',
      './src/assets/js/c3.min.js',
      './src/assets/js/datetime-picker.js',
      './src/assets/js/inputmask.js',
      './src/assets/js/fileinput.js'
    ],
    angular: [
      'angular',
      'angular-route',
      'angular-i18n/angular-locale_pt-br',
      'angular-sanitize',
      'videogular',
      'videogular-controls/vg-controls',
      'videogular-overlay-play/vg-overlay-play',
      'videogular-poster/vg-poster',
      'videogular-buffering/vg-buffering',
      'angular-crumble',
      'angular-resource',
      'angular-local-storage',
      'c3-angular',
      'matchmedia-ng',
      './src/assets/js/bootbox.js',
      'textangular/dist/textAngular-sanitize',
      'angular-bootstrap-colorpicker/js/bootstrap-colorpicker-module',
      'angular-input-masks',
      'angular-ui-bootstrap/dist/ui-bootstrap',
      'angular-ui-bootstrap/dist/ui-bootstrap-tpls',
      'angular-tooltips/dist/angular-tooltips',
      'angular-recaptcha/release/angular-recaptcha.min'
    ],
    styles: [
      'textangular/dist/textAngular.css',
      'c3/c3.min.css',
      'angular-bootstrap-colorpicker/css/colorpicker.min.css',
      'eonasdan-bootstrap-datetimepicker/build/css/bootstrap-datetimepicker.min.css',
      'bootstrap/dist/css/bootstrap.min.css',
      'bootstrap-fileinput/css/fileinput.min.css',
      'font-awesome/css/font-awesome.min.css',
      'ionicons/css/ionicons.min.css',
      'angular-tooltips/dist/angular-tooltips.min.css',
      'sweetalert/dist/sweetalert.css',
      './src/assets/css/AdminLTE.css',
      './src/assets/css/style.css'
    ],
    i18n: './src/assets/js/i18n.js',
    app: './src/app.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader']
      },
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.(s[ac]|c)ss$/i,
        use: [
          // Creates `style` nodes from JS strings
          'style-loader',
          // Translates CSS into CommonJS
          'css-loader',
          // Compiles Sass to CSS
          'sass-loader'
        ]
      },
      {
        test: /\.(png|svg|jpe?g|gif|eot|woff|woff2|ttf)$/,
        use: [
          {
            loader: 'file-loader', // This will resolves import/require() on a file into a url and emits the file into the output directory.
            options: {
              name: '[name].[ext]',
              outputPath: 'assets/'
            }
          }
        ]
      },
      {
        test: /\.html$/,
        use: {
          loader: 'html-loader',
          options: {
            minimize: false
          }
        }
      }
    ]
  },
  plugins: [
    new EnvironmentPlugin({
      NODE_ENV: process.env.NODE_ENV || 'development'
    }),
    new DashboardPlugin(),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      favicon: './src/assets/images/favicon.ico'
    })
  ]
}
