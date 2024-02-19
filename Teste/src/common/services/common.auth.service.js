import Auth0Lock from 'auth0-lock'
import { BehaviorSubject } from 'rxjs'

import * as authType from '../config/auth'

export const isDev = process.env.NODE_ENV === 'development'
export const defaultAlias = 'apidev2'

const aliasUrl = window.location.origin?.replace(/http(s|):\/\//, '')?.split('.')[0]
const alias = isDev ? defaultAlias : aliasUrl

const audience = 'eticca-application-dev'

const isEnterprise = Object.keys(authType.cognito).some(currAlias => currAlias === alias)

export const AUTH_ROUTE_ACCESS = {
  DEFAULT: -1,
  UNAUTHENTICATED: 0,
  FORBIDDEN: 1,
  WITHOUT_ALIAS: 2,
  AWAIT_AUTH: 3
}

export const AUTH_ROLES = {
  IS_USER: 0,
  IS_OPERATOR: 1,
  IS_MANAGER: 2,
  IS_ADMIN: 3
}

/**
 * @description Define if device is a mobile
 * @author Douglas Lima
 * @date 15/12/2022
 * @return {*}  {boolean}
 */
const isMobile = () => window.innerWidth <= 500

const authService = (location, storageService, logoUrlService) => {
  const apiUrl = window.__API_URL

  const logo = logoUrlService.getUrlLogoLogin()
  const authCode = location.search()?.code

  const lock = new Auth0Lock(
    'ODB8WznMbYMJ1HRCqimye0QEEuWPMmDe',
    'eticca.auth0.com',
    {
      auth: {
        redirectUrl: window.location.origin,
        responseType: 'token id_token',
        audience
      },
      theme: {
        logo: '',
        hideMainScreenTitle: true,
        primaryColor: '#1c6499',
      },
      language: 'pt-br',
      primaryColor: "#1c6499",
      container:'',
      allowShowPassword: true,
      allowSignUp: false,
      rememberLastLogin: true,
      container: isMobile() ? 'auth0-login-container-mobile' : 'auth0-login-container'
    }
  )

  if (isDev) {
    window.lock = lock
  }

  const loading = new BehaviorSubject(true)
  const authStorage = storageService.factory('ETICCA.AUTH')
  const authClaimsKey = 'A0_CLAIMS'
  const userKey = 'APP_USER'

  const login = () => {
    if (isEnterprise) {
      const { endpoint, clientId, responseType, scope } = authType.cognito[alias]
      const redirectUri = isDev ? 'http://localhost:3000/' : `https://${alias}.eticca.app/enterprise/`

      const url = authType.getUrl(endpoint, clientId, responseType, scope, encodeURIComponent(`${redirectUri}`))
      window.location.href = url
    } else {
      lock.show()
    }
  }

  const logout = () => {
    storeAuth(null, null)
    setUserInfo(null)

    if (isEnterprise) {
      window.location.href = window.location.origin
    } else {
      lock.logout({
        returnTo: window.location.origin
      })
    }
  }

  const getToken = () => {
    const claims = authStorage.get(authClaimsKey)
    const { accessToken, idToken } = claims?.raw || {
      accessToken: null,
      idToken: null
    }
    return { accessToken, idToken }
  }

  const getUserInfo = () => {
    const { user } = authStorage.get(userKey) || { user: null }
    return user
  }

  const setUserInfo = (user) => {
    const userInfo = {
      user,
      updatedAt: Date.now()
    }
    authStorage.set(userKey, userInfo)
  }

  const isAuthenticated = () => {
    const token = getToken().accessToken
    if (token) {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = JSON.parse(decodeURIComponent(atob(base64).split('').map((c) =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')))
      return Date.now() <= jsonPayload.exp * 1000
    }
    return false
  }

  const isAdmin = () => isAuthenticated() && !!getUserInfo()?.isAdmin
  const isOperator = () => isAuthenticated() && !!getUserInfo()?.isOperador
  const isManager = () => isAuthenticated() && !!getUserInfo()?.isManager
  const isUser = () => isAuthenticated() && !!getUserInfo()?.isAtivo

  const routeGuardWithRole = (ROLE) => {
    switch (ROLE) {
      case AUTH_ROLES.IS_ADMIN:
        return [isAdmin(), AUTH_ROUTE_ACCESS.FORBIDDEN]
      case AUTH_ROLES.IS_OPERATOR:
        return [isOperator(), AUTH_ROUTE_ACCESS.FORBIDDEN]
      case AUTH_ROLES.IS_MANAGER:
        return [isManager(), AUTH_ROUTE_ACCESS.FORBIDDEN]
      case AUTH_ROLES.IS_USER:
        return [isUser(), AUTH_ROUTE_ACCESS.UNAUTHENTICATED]
      default:
        return [true, AUTH_ROUTE_ACCESS.DEFAULT]
    }
  }

  const storeAuth = (raw, profile) => {
    const claims = {
      raw,
      profile,
      actualAlias: getUnauthenticatedActualAlias(),
      updatedAt: Date.now()
    }
    authStorage.set(authClaimsKey, claims)
    return claims
  }

  const checkSession = () => new Promise((resolve, reject) => {
    if (isEnterprise) {
      try {
        if (isAuthenticated()) resolve()
        else {
          if (!authCode) {
            throw new Error('Auth code not defined')
          }

          fetch(`${apiUrl}/enterprise?code=${authCode}`, {
            method: 'GET',
            headers: {
              alias
            }
          })
            .then(authUser => authUser.json())
            .then(authUser => {
              const authResult = {
                code: authUser.code,
                accessToken: authUser[authType.cognito[alias].tokenField] || authUser.access_token,
                idToken: authUser.id_token,
                refreshToken: authUser.refresh_token,
                expiresIn: authUser.expires_in,
                tokenType: authUser.token_type
              }

              storeAuth(authResult, null)
              resolve()
            })
        }
      } catch (error) {
        return reject(error)
      }
    } else {
      lock.checkSession({ audience }, (error, authResult) => {
        if (error) {
          return reject(error)
        }

        lock.getProfile(authResult.accessToken, (error, profile) => {
          if (error) {
            return reject(error)
          }
          storeAuth(authResult, profile)
          resolve()
        })
      })
    }
  })

  checkSession()
    .then(async () => {
      const claims = authStorage.get(authClaimsKey)
      const res = await fetch(`${apiUrl}/usuario`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${claims.raw.accessToken}`,
          alias: claims.actualAlias
        }
      })
      const user = await res.json()
      return user
    })
    .then(setUserInfo)
    .catch(() => {
      storeAuth(null, null)
      return null
    })
    .finally(() => {
      loading.next(false)
    })

  const getUnauthenticatedActualAlias = () => alias

  return {
    loading,
    login,
    logout,
    getToken: () => getToken()?.accessToken,
    getActualAlias: () => authStorage.get(authClaimsKey)?.actualAlias,
    getUnauthenticatedActualAlias,
    getUserInfo,
    isAuthenticated,
    routeGuardWithRole,
    isAdmin,
    isOperator,
    isManager,
    isUser,
    isMobile
  }
}

angular.module('eticca.common').service('authService', ['$location', 'storageService', 'logoUrlService', authService])
