import complaintTemplate from './sessions/public.complaint.html'
import faqTemplate from './sessions/public.faq.html'
import signupTemplate from './sessions/public.signup.html'

const complaintConfig = ($routeProvider) => {
  $routeProvider.when('/public', {
    redirectTo: '/auth/login',
    label: ''
  }).when('/denuncia', {
    template: complaintTemplate,
    controller: 'public.complaint',
    controllerAs: 'COMPLAINT',
    label: 'Eticca',
    subTitle: 'Denúncia'
  }).when('/public/faq', {
    template: faqTemplate,
    controller: 'public.faq',
    controllerAs: 'FAQ',
    label: 'Eticca',
    subTitle: 'Denúncia'
  }).when('/public/signup/:id', {
    template: signupTemplate,
    controller: 'public.signup',
    controllerAs: 'SIGNUP',
    label: 'Eticca',
    subTitle: 'Signup'
  })
}

angular.module('eticca.public').config([
  '$routeProvider',
  complaintConfig
])
