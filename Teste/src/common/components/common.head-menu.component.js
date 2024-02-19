import headMenuTemplate from './common.head-menu.component.html'

const headMenu = (authService) => {
  const link = (scope) => {
    if (angular.isUndefined(scope.params) || !scope.params) {
      throw new Error('Params is not defined!')
    }

    const logout = async () => {
      authService.logout(true)
    }

    scope.isMobile = authService.isMobile()
    scope.keys = {
      denuncia: window.i18n('#denuncia'),
      entidadesPublicas: window.i18n('#contatoEntidadePublica')
    }
    scope.params.logo = angular.isDefined(scope.params.logo) ? scope.params.logo : {}
    scope.params.id = angular.isDefined(scope.params.id) ? scope.params.id : Math.round(Math.random() * 10000)
    scope.logout = logout
  }

  return {
    template: headMenuTemplate,
    restrict: 'E',
    replace: true,
    scope: { params: '=' },
    link
  }
}

angular.module('eticca.common').directive('headMenu', ['authService', headMenu])
