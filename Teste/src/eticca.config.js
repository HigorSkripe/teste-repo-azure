import { routeGuardFactory, routeGuardErrorHandlerFactory } from './common/utils/route-guard.factory'
import { AUTH_ROLES } from './common/services/common.auth.service'

const eticcaConfig = ($locationProvider, $routeProvider, httpProvider) => {
  const passHttpError = {
    403: ['/app/perfil'],
    401: ['/auth/login']
  }
  $locationProvider.hashPrefix('')
  $locationProvider.html5Mode(true)
  $routeProvider.when('/', {
    label: '',
    redirectTo: '/app'
  })
  $routeProvider.otherwise({
    redirectTo: '/app',
    resolve: {
      guard: routeGuardFactory(AUTH_ROLES.IS_USER)
    }
  })

  httpProvider.interceptors.push([
    '$q',
    '$location',
    'authService',
    (q, location, authService) => ({
      request: (config) => {
        config.headers = config.headers || {}
        if (/^.+.s3.+.amazonaws.com.+$/.test(config.url)) {
          return config
        } else if (/^.+.execute-api.+.amazonaws.com.+$/.test(config.url)) {
          return config
        } else if (authService.isAuthenticated()) {
          config.headers.Authorization = 'Bearer ' + authService.getToken()
          config.headers.alias = authService.getActualAlias()
        } else {
          config.headers.alias = authService.getUnauthenticatedActualAlias()
        }
        return config
      },
      responseError: (response) => {
        if (!passHttpError[response.status]?.some(path => location.path() === path)) {
          if (response.status === 401) {
            authService.logout()
            location.path('/auth/login')
          } else if (response.status === 403) {
            location.path('/403')
          }
        }
        return q.reject(response)
      }
    })
  ])
}

angular.module('eticca').config([
  '$locationProvider',
  '$routeProvider',
  '$httpProvider',
  eticcaConfig
]).run(routeGuardErrorHandlerFactory())
