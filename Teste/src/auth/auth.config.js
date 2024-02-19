import loginTemplate from './sessions/auth.login.html'
import forgotTemplate from './sessions/auth.forgot.html'

const defaultAuthGuard = ['authService', (authService) => {
  if (authService.isAuthenticated() && authService.getUserInfo()) {
    throw Object.assign(new Error('Authenticated'), { code: -2 })
  }
}]

const authConfig = ($routeProvider) => {
  $routeProvider.when('/auth', {
    label: '',
    redirectTo: '/auth/login'
  }).when('/auth/login', {
    template: loginTemplate,
    controller: 'login',
    controllerAs: 'LOGIN',
    label: 'Eticca',
    subTitle: 'Login',
    resolve: {
      guard: defaultAuthGuard
    }
  }).when('/auth/forgot', {
    template: forgotTemplate,
    controller: 'forgot',
    controllerAs: 'FORGOT',
    label: 'Eticca',
    subTitle: 'Esqueci minha senha',
    resolve: {
      guard: defaultAuthGuard
    }
  })
}

angular.module('eticca.auth').config([
  '$routeProvider',
  authConfig
]).run(['$rootScope', 'authService', '$location', (rootScope, authService, location) => {
  rootScope.$on('$routeChangeError', (_event, _current, _previous, rejection) => {
    if (rejection.code === -2) {
      location.path(authService.isAdmin() || authService.isManager() || authService.isOperator() ? '/admin' : '/app')
    }
  })
}])
