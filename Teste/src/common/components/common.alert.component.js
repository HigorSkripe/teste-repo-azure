import alertTemplate from './common.alert.component.html'

const alert = (timeout) => {
  const link = (scope) => {
    // Directive usada sem nenhum parâmetro
    if (angular.isUndefined(scope.params)) {
      throw new Error('params não definido!')
    }
    // Directive sem tipo permitido
    if (Object.keys(_defaultFa).indexOf(scope.params.type) === -1) {
      throw new Error('type não é válido!')
    }
    scope.params.id = angular.isDefined(scope.params.id) && (angular.isString(scope.params.id) || angular.isNumber(scope.params.id)) ? scope.params.id : 'alert_' + Math.round(Math.random() * 123)
    scope._fa = angular.isString(scope.params.fa) ? scope.params.fa : _defaultFa[scope.params.type]
    timeout(() => {
      $($.parseHTML(scope.params.content)).appendTo($('#' + scope.params.id))
    })
  }
  const _defaultFa = {
    danger: 'fa-ban',
    info: 'fa-info',
    warning: 'fa-warning',
    success: 'fa-check'
  }

  return {
    template: alertTemplate,
    restrict: 'E',
    replace: true,
    scope: { params: '=' },
    link
  }
}

angular.module('eticca.common').directive('alert', [
  '$timeout',
  alert
])
