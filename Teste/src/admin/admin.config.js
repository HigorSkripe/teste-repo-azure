import { routeGuardFactory, routeGuardErrorHandlerFactory } from '../common/utils/route-guard.factory'
import { AUTH_ROLES } from '../common/services/common.auth.service'

// templates
import dashboardTemplate from './sessions/admin.dashboard.html'
import stakeholderMappingTemplate from './sessions/admin.stakeholder-mapping.html'
import riskMappingTemplate from './sessions/admin.risk-mapping.html'
import preRegistrationTemplate from './sessions/admin.pre-registration.html'
import usersGroupTemplate from './sessions/admin.users-group.html'
import usersTemplate from './sessions/admin.users.html'
import faqTemplate from './sessions/admin.faq.html'
import complaintTemplate from './sessions/admin.complaint.html'
import questionsTemplate from './sessions/admin.questions.html'
import trainingTemplate from './sessions/admin.training.html'
import companyTemplate from './sessions/admin.company.html'
import diligenceTemplate from './sessions/admin.diligence.html'
import documentsTemplate from './sessions/admin.documents.html'
import programVersionTemplate from './sessions/admin.program-version.html'
import translateKeys from './sessions/admin.translate-keys.html'
import repositoryTemplate from './sessions/admin.repository.html'
import repositoryDetalheTemplate from './sessions/admin.repository-detail.html'
import clientReportTemplate from './sessions/admin.client-report.html'

const guard = routeGuardFactory([
  AUTH_ROLES.IS_OPERATOR,
  AUTH_ROLES.IS_MANAGER,
  AUTH_ROLES.IS_ADMIN
])
const routeGuardErrorHandler = routeGuardErrorHandlerFactory()

const adminConfig = (routeProvider) => {
  routeProvider.when('/admin', {
    label: window.i18n('#admin'),
    redirectTo: '/admin/dashboard'
  }).when('/admin/dashboard', {
    template: dashboardTemplate,
    controller: 'admin.dashboard',
    controllerAs: 'DASH',
    label: 'Dashboard',
    subTitle: 'Painel de Acompanhamento',
    resolve: {
      guard
    }
  }).when('/admin/mapeamento-stakeholders', {
    template: stakeholderMappingTemplate,
    controller: 'admin.stakeholder-mapping',
    controllerAs: 'MAPAS',
    label: 'Mapeamento de Stakeholders',
    subTitle: 'Administrador'
  }).when('/admin/mapeamento-riscos', {
    template: riskMappingTemplate,
    controller: 'admin.risk-mapping',
    controllerAs: 'MAPAR',
    label: 'Mapeamento de Risco',
    subTitle: 'Probabilidade x Impacto'
  }).when('/admin/pre-registro', {
    template: preRegistrationTemplate,
    controller: 'admin.pre-registration',
    controllerAs: 'PRER',
    label: 'Pré-Registro',
    subTitle: 'Administrador'
  }).when('/admin/grupo-usuarios', {
    template: usersGroupTemplate,
    controller: 'admin.users-group',
    controllerAs: 'GUSU',
    label: 'Grupo de Usuários',
    subTitle: 'Administrador'
  }).when('/admin/usuarios', {
    template: usersTemplate,
    controller: 'admin.users',
    controllerAs: 'USUA',
    label: 'Usuários',
    subTitle: 'Administrador'
  }).when('/admin/faq', {
    template: faqTemplate,
    controller: 'admin.faq',
    controllerAs: 'FAQ',
    label: 'FAQ',
    subTitle: 'Administrador'
  }).when('/admin/denuncias', {
    template: complaintTemplate,
    controller: 'admin.complaint',
    controllerAs: 'DENU',
    label: window.i18n('#denuncia'),
    subTitle: 'Administrador'
  }).when('/admin/questoes', {
    template: questionsTemplate,
    controller: 'admin.questions',
    controllerAs: 'QUES',
    label: 'Questões',
    subTitle: 'Administrador'
  }).when('/admin/treinamento', {
    template: trainingTemplate,
    controller: 'admin.training',
    controllerAs: 'TREI',
    label: 'Treinamento',
    subTitle: 'Administrador'
  }).when('/admin/empresa', {
    template: companyTemplate,
    controller: 'admin.company',
    controllerAs: 'EMPR',
    label: 'Empresa',
    subTitle: 'Administrador'
  }).when('/admin/diligencia', {
    template: diligenceTemplate,
    controller: 'admin.diligence',
    controllerAs: 'DILI',
    label: 'Diligência',
    subTitle: 'Administrador'
  }).when('/admin/documentos', {
    template: documentsTemplate,
    controller: 'admin.documents',
    controllerAs: 'DOCU',
    label: 'Documentos',
    subTitle: 'Administrador'
  }).when('/admin/versao-programa', {
    template: programVersionTemplate,
    controller: 'admin.program-version',
    controllerAs: 'VPRO',
    label: 'Versão do Programa',
    subTitle: 'Administrador'
  }).when('/admin/chaves-traducao', {
    template: translateKeys,
    controller: 'admin.translate-keys',
    controllerAs: 'CTRA',
    label: 'Chaves de Tradução',
    subTitle: 'Chaves de Tradução'
  }).when('/admin/repositorio-documentos', {
    template: repositoryTemplate,
    controller: 'admin.repository',
    controllerAs: 'REPO',
    label: 'Repositório de Documentos',
    subTitle: 'Administrador'
  }).when('/admin/detalhe-documento/:docId', {
    template: repositoryDetalheTemplate,
    controller: 'admin.repository-detail',
    controllerAs: 'REPODET',
    label: 'Visualização do Documento',
    subTitle: 'Administrador'
  }).when('/admin/relatorio-clientes', {
    template: clientReportTemplate,
    controller: 'admin.client-report',
    controllerAs: 'RELC',
    label: 'Relatório de Clientes',
    subTitle: 'Relatório de Clientes'
  })
}

angular.module('eticca.admin')
  .config(['$routeProvider', '$sceDelegateProvider', adminConfig])
  .run(routeGuardErrorHandler);

angular.module('eticca.admin').config([
  '$sceDelegateProvider',
   function($sceDelegateProvider) {
    // Adicione a URL da sua aplicação à lista de confiança
    $sceDelegateProvider.resourceUrlWhitelist([
      // Adicione aqui os padrões de URL permitidos
      'self',
      'data:**', // Permitir URLs de dados
      'https://app-eticca-files.s3.us-west-2.amazonaws.com/**' // Substitua pelo padrão real da sua URL
    ]);}
]);
