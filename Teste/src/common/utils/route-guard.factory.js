import { isArray } from 'angular'
import { AUTH_ROUTE_ACCESS } from '../services/common.auth.service'

const getHasAccess = (authService, ROLES = []) => {
  const defaultAccess = [false, -1]
  if (ROLES.length === 0) {
    return defaultAccess
  }
  return ROLES.reduce((prev, ROLE) => {
    if (prev[0]) {
      return prev
    }
    return authService.routeGuardWithRole(ROLE)
  }, defaultAccess)
}

export const routeGuardFactory = (ROLE) => ['authService', (authService) => {
  const [hasAccess, code] = getHasAccess(authService, isArray(ROLE) ? ROLE : [ROLE])
  if (!hasAccess) {
    throw Object.assign(new Error(code), { code })
  }
}]

export const routeGuardErrorHandlerFactory = () => ['$rootScope', 'authService', '$location', (rootScope, authService, location) => {
  const accessRedirectPathMapper = {
    [AUTH_ROUTE_ACCESS.AWAIT_AUTH]: '/auth/login',
    [AUTH_ROUTE_ACCESS.UNAUTHENTICATED]: '/auth/login',
    [AUTH_ROUTE_ACCESS.WITHOUT_ALIAS]: '/auth/select-company',
    [AUTH_ROUTE_ACCESS.FORBIDDEN]: '/403',
    [AUTH_ROUTE_ACCESS.DEFAULT]: authService.isAdmin() || authService.isOperator() || authService.isManager() ? '/admin' : '/app'
  }

  rootScope.$on('$routeChangeError', (_event, _current, _previous, rejection) => {
    if (rejection.code === AUTH_ROUTE_ACCESS.UNAUTHENTICATED && !!authService.getUserInfo()) {
      authService.logout()
    }
    location.path(accessRedirectPathMapper[rejection.code])
  })
}]
