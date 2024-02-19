import { omit } from 'ramda'
import Inputmask from "inputmask";

class LoginController {
  constructor($scope, $http, location, storageService, auth, reCaptchaService,
    vcRecaptchaService, logoUrlService, alert) {
    this.$scope = $scope
    this.$http = $http
    this.location = location
    this.storageService = storageService
    this.auth = auth
    this.reCaptchaService = reCaptchaService
    this.vcRecaptchaService = vcRecaptchaService
    this.logoUrlService = logoUrlService
    this.alert = alert
    this.apiUrl = window.__API_URL
    this.$scope.email = ''
    this.$scope.password = ''
    this.loginError = ''
    this.isLoading = true
    this.$scope.reCaptchaSiteKey = reCaptchaService.siteKey

    this.srcLogo = this.logoUrlService.getUrlLogoLogin()
    this.isMobileLogin = false
    this.isLogin = false
    this.isDenuncia = false;
    this.isFAQ = false;
    this.modalForm = {
      assunto: '',
      texto: '',
      button: '',
      name: '',
      email: '',
      telefone: '',
      clearModalForm: this.faqClearModalForm.bind(this),
      save: this.faqSaveModalForm.bind(this),
    }
    this._onInit()
  }

  async _onInit() {
    try {
      const portalDisabled = 'O Portal foi desativado.'
      const portalNotConfigured = 'Portal não configurado, contate o administrador.'

      this.verifyAuthentication();
      this.login();

      this.$http.get(`${this.apiUrl}/empresa`)
        .then((resp) => {
          const company = resp.data
          if (company) {
            if (company.active) this.verifyAuthentication()
            else this.loginError = portalDisabled
          } else {
            this.loginError = portalNotConfigured
          }
        }, (error) => {
          this.loginError = error.data.message === 'company not found' ? portalNotConfigured : 'Ocorreu um erro inesperado!'
        })
    } catch (error) {
      console.error(error)
    }
  }

  showLoginErrorMessage(error) {
    console.error(error)
    this.isLoading = false
    this.alert.error('Login não autorizado.\nProcure o administrador do sistema.')
  }

  verifyAuthentication() {
    this.auth.loading
      .subscribe((value) => {
        if (this.auth.isAuthenticated() && this.auth.getUserInfo()) {
          setTimeout(() => {
            this.$scope.$apply(() => {
              /* Updating the login info */
              this.$http.post(`${this.apiUrl}/usuario/updatelogininfo`, {})
                .then(() => {
                  const redirectPath = this.auth.isAdmin() || this.auth.isOperator() || this.auth.isManager()
                    ? '/admin/dashboard'
                    : '/app/dashboard'

                  // Remove the code field from query string parameters
                  this.location.search(omit(['code'], this.location.search()))
                  this.location.path(redirectPath)
                })
                .catch(this.showLoginErrorMessage.bind(this))
            })
          }, 100)

          return
        }

      })

    this.$scope.success = this.getURLParameter('message') === 'forgot' ? 'Senha alterada com sucesso!' : ''

    if (this.$scope.success === '') {
      this.$scope.success = this.getURLParameter('message') === 'newUser' ? 'Usuario Cadastrado com Sucesso!' : ''
    }

    this.$scope.openForgot = this.openForgot.bind(this)
    this.$scope.recapchaExpiration = this.recapchaExpiration.bind(this)
    this.$scope.denuncia = 'Denúncia' || window.i18n('#denuncia')
    this.$scope.tituloportal = 'Portal Compliance' || window.i18n('#tituloportal')

    this.$scope.forgot = () => {
      const email = $('#email').val();
      const patern = /^([0-9a-zA-Z]([-_\\.]*[0-9a-zA-Z]+)*)@([0-9a-zA-Z]([-_\\.]*[0-9a-zA-Z]+)*)[\\.]([a-zA-Z]{2,9})$/

      if (!email || !patern.test(email)) {
        this.$scope.errorForgot = 'Por favor preencha corretamente o email!'
        return
      }

      this.$scope.loadForgot = true
      this.$scope.errorForgot = null

      this.$http.post(`${this.apiUrl}/forgotpassword`, { email: email, recaptcha: this.$scope.recaptchaResponse })
        .then((_data) => {
          this.$scope.success = 'Email enviado com sucesso!'

          $('#modalForgot').modal('hide')
          setTimeout(() => {
            $('html, body').animate({ scrollTop: 0 }, 'fast')
          }, 300)

          this.$scope.loadForgot = false
        }, (error) => {
          if (error && error.error === 'recaptcha') {
            this.$scope.errorForgot = 'Ocorreu um erro no recaptcha, por favor refaça a verificação "Não sou um robô'
          } else {
            this.$scope.errorForgot = error.data.message
          }

          this.$scope.loadForgot = false
        })
    }
  }

  getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [
      null,
      ''
    ])[1].replace(/\+/g, '%20')) || null
  }

  openForgot() {
    $('#modalForgot').modal('show')
  }

  recapchaExpiration() {
    this.$scope.recaptchaResponse = undefined
  }

  login() {
    this.isMobileLogin = this.auth.isMobile();
    this.auth.login();
  }

  openDenuncia(tipo) {
    const comStorage = this.storageService.factory('ETICCA.COMPLAINT');
    if (tipo === 'nova') {
      comStorage.set('aba', 'new');
      this.location.path('/denuncia')
    } else {
      comStorage.set('aba', 'search');
      this.location.path('/denuncia')
    }
  }

  openFaq(tipo) {
    if (tipo === 'busca') {
      this.location.path('/public/faq')
    } else {
      this.faqClearModalForm()
      $('#modalFaq').modal('show')
    }
  }

  faqSaveModalForm() {

    debugger;

    const email = this.modalForm.email;
    const patern = /^([0-9a-zA-Z]([-_\\.]*[0-9a-zA-Z]+)*)@([0-9a-zA-Z]([-_\\.]*[0-9a-zA-Z]+)*)[\\.]([a-zA-Z]{2,9})$/

    if (!email || !patern.test(email)) {
      this.alert.error('Por favor preencha corretamente o email!');
      return;
    }

    const body = {
      assunto: this.modalForm.assunto,
      texto: this.modalForm.texto,
      nome: this.modalForm.name,
      email: this.modalForm.email,
      phone: this.modalForm.telefone,
      recaptcha: this.$scope.recaptchaResponse
    }

    this.$http.post(`${this.apiUrl}/faq/suporte`, body)
      .then((data) => {
        this.alert.success('Seu e-mail foi enviado ao suporte.')
        $('#modalFaq').modal('hide')
      })
      .catch((error) => {
        if (error) {
          if (error.data && error.data.message === 'Invalid recaptcha') {
            this.$scope.error = this.getRecaptchError()
          } else {
            this.$scope.error = error
          }
        }
      })
  }

  faqClearModalForm() {
    for (const i in this.modalForm.model) {
      this.modalForm.model[i] = typeof this.modalForm.model[i] === 'boolean' ? false : ''
    }
  }

  setRcNewDenuncia(widgetId) {
    this.$scope.rcNewDenuncia = widgetId
  }

  reloadRecaptcha(widgetId) {
    this.vcRecaptchaService.reload(widgetId)
  }

  getRecaptchError() {
    return { message: 'Ocorreu um erro no recaptcha, por favor refaça a verificação "Não sou um robô".' }
  }
}

angular.module('eticca.auth').controller('login', [
  '$scope',
  '$http',
  '$location',
  'storageService',
  'authService',
  'reCaptchaService',
  'vcRecaptchaService',
  'logoUrlService',
  'alertService',
  LoginController
])

jQuery(() => {
  $('#faqTelefone').inputmask('(99) 9999[9]-9999')

})
