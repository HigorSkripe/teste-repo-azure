import { defaultAlias, isDev } from './common.auth.service'

const alias = isDev ? defaultAlias : window.location.origin?.replace(/http(s|):\/\//, '')?.split('.')[0]
const src = `https://${alias}.eticca.app/${alias}/resources`

export const getUrlLogo = () => `${src}/logo.png`
export const getUrlLogoLogin = () => `${src}/logologin.png`

angular.module('eticca.common').factory('logoUrlService', [() => ({ getUrlLogo, getUrlLogoLogin })])
