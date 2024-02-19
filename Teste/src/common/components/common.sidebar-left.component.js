import sidebarLeftTemplate from './common.sidebar-left.component.html'

const sidebarLeft = () => {
  const link = (scope) => {
    // Error if not have parameter
    if (angular.isUndefined(scope.params) || !scope.params) {
      throw new Error('params não definido!')
    }
  }

  return {
    template: sidebarLeftTemplate,
    restrict: 'E',
    replace: true,
    scope: {
      params: '=',
      toggleFn: '=?'
    },
    link
  }
}

angular.module('eticca.common').directive('sidebarLeft', [
  sidebarLeft
])
