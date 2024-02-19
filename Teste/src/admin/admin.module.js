// hack: https://github.com/textAngular/textAngular/issues/713
// hack2: https://stackoverflow.com/questions/50448326/uncaught-typeerror-angular-lowercase-is-not-a-function
angular.lowercase = text => typeof text === 'string' ? text.toLowerCase() : text
window.rangy = require('rangy')
window.rangy.saveSelection = require('rangy/lib/rangy-selectionsaverestore')
require('textangular')

angular.module('eticca.admin', [
  'ngRoute',
  'gridshore.c3js.chart',
  'LocalStorageModule',
  'ngResource',
  'colorpicker.module',
  'textAngular',
  'ui.utils.masks',
  'ui.bootstrap'
])
