import contentHeaderTemplate from './common.content-header.component.html'

const contentHeader = (route, crumble) => {
  const link = (scope) => {
    scope.crumble = crumble
    scope.route = route
  }

  return {
    template: contentHeaderTemplate,
    restrict: 'E',
    replace: true,
    scope: {},
    link
  }
}

angular.module('eticca.common').directive('contentHeader', [
  '$route',
  'crumble',
  contentHeader
])
