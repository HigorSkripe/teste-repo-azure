import { routeGuardFactory, routeGuardErrorHandlerFactory } from '../common/utils/route-guard.factory'
import { AUTH_ROLES } from '../common/services/common.auth.service'

// templates
import templateDashboard from './sessions/collaborator.dashboard.html'
import introTemplate from './sessions/collaborator.intro.html'
import trainingTemplate from './sessions/collaborator.training.html'
import codeOfEthicsTemplate from './sessions/collaborator.code-of-ethics.html'
import codeOfConductTemplate from './sessions/collaborator.code-of-conduct.html'
import certificationTemplate from './sessions/collaborator.certification.html'
import acceptTermsTemplate from './sessions/collaborator.accept-terms.html'
import faqTemplate from './sessions/collaborator.faq.html'
import profileTemplate from './sessions/collaborator.profile.html'
import publicEntitiesTemplate from './sessions/collaborator.public-entities.html'

const guard = routeGuardFactory(AUTH_ROLES.IS_USER)
const routeGuardErrorHandler = routeGuardErrorHandlerFactory()

const collaboratorConfig = (routeProvider) => {
  routeProvider.when('/app', {
    label: window.i18n('#app'),
    redirectTo: '/app/dashboard'
  }).when('/app/dashboard', {
    template: templateDashboard,
    controller: 'dashboard',
    controllerAs: 'DASH',
    label: 'Dashboard',
    subTitle: 'Painel de Acompanhamento',
    resolve: {
      guard
    }
  }).when('/app/introducao', {
    template: introTemplate,
    controller: 'intro',
    controllerAs: 'INTR',
    label: window.keyCodigo('intro'),
    subTitle: window.keyCodigo('intro'),
    resolve: {
      guard
    }
  }).when('/app/treinamento', {
    template: trainingTemplate,
    controller: 'training',
    controllerAs: 'TREI',
    label: 'Treinamento',
    subTitle: 'Treinamento',
    resolve: {
      guard
    }
  }).when('/app/codigoetica', {
    template: codeOfEthicsTemplate,
    controller: 'codeOfEthics',
    controllerAs: 'CODE',
    label: window.keyCodigo('codigo_etica'),
    subTitle: window.keyCodigo('codigo_etica'),
    resolve: {
      guard
    }
  }).when('/app/codigoconduta', {
    template: codeOfConductTemplate,
    controller: 'codeOfConduct',
    controllerAs: 'CODC',
    label: window.keyCodigo('codigo_conduta'),
    subTitle: window.keyCodigo('codigo_conduta'),
    resolve: {
      guard
    }
  }).when('/app/certificacao', {
    template: certificationTemplate,
    controller: 'certification',
    controllerAs: 'CERT',
    label: 'Certificação',
    subTitle: 'Certificação',
    resolve: {
      guard
    }
  }).when('/app/termoaceite', {
    template: acceptTermsTemplate,
    controller: 'acceptTerms',
    controllerAs: 'TERM',
    label: 'Termo de Aceite',
    subTitle: 'Termo de Aceite',
    resolve: {
      guard
    }
  }).when('/app/faq', {
    template: faqTemplate,
    controller: 'faq',
    controllerAs: 'FAQ',
    label: 'FAQ',
    subTitle: 'Dúvidas Comuns',
    resolve: {
      guard
    }
  }).when('/app/perfil', {
    template: profileTemplate,
    controller: 'profile',
    controllerAs: 'PERF',
    label: 'Perfil',
    subTitle: 'Perfil do colaborador',
    resolve: {
      guard
    }
  }).when('/app/contato-entidade-publica', {
    template: publicEntitiesTemplate,
    controller: 'publicEntities',
    controllerAs: 'CONEP',
    label: 'Contato com entidades públicas',
    subTitle: ''
  })
}

angular.module('eticca.collaborator').config([
  '$routeProvider',
  collaboratorConfig
]).run(routeGuardErrorHandler)
