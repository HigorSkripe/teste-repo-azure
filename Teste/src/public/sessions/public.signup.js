import * as cpfFunction from '@fnando/cpf'
import { trim } from 'ramda'

const readyFn = []

class ComplaintController {
  constructor ($scope, $timeout, $http, $routeParams, reCaptchaService, vcRecaptchaService, alert, authService, logoUrlService) {
    this.$scope = $scope
    this.$timeout = $timeout
    this.$http = $http
    this.$routeParams = $routeParams
    this.reCaptchaService = reCaptchaService
    this.vcRecaptchaService = vcRecaptchaService
    this.alert = alert
    this.authService = authService
    this.logoUrlService = logoUrlService
    this.apiUrl = window.__API_URL
    this.preRegisterId = this.$routeParams.id
    this.preRegister = null

    this.srcLogo = this.logoUrlService.getUrlLogo()

    $scope.reCaptchaSiteKey = reCaptchaService.siteKey
    $scope.email = ''
    $scope.nome = ''
    $scope.cpf = ''
    $scope.senha = ''
    $scope.confirmarSenha = ''

    Object.assign($scope, this)
    this._onInit()
  }

  _onInit () {
    this.$http.get(`${this.apiUrl}/signup/${this.preRegisterId}`)
      .then((resp) => {
        this.preRegister = resp.data
        this.$scope.email = this.preRegister.email
        this.$scope.cpf = this.preRegister.cpf
        this.$scope.nome = this.preRegister.nome
        this.$scope.registeredCpf = !!this.$scope.cpf
        this.$scope.registeredName = !!this.$scope.nome
      })
      .catch((error) => {
        this.handlerError(error)
      })

    readyFn.push(() => {
      $('#newInfoModal').on('show.bs.modal', () => {
        this.$scope.$apply(() => {
          this.reloadRecaptcha(this.$scope.rcNewInfoId)
        })
      })
    })
  }

  signup () {
    if (!this.$scope.email || !this.$scope.nome || !this.$scope.cpf || !this.$scope.senha || !this.$scope.confirmarSenha) {
      this.alert.error('Todos os campos são obrigatórios!')
      $('html, body').animate({ scrollTop: 0 }, 'fast')
      return
    }
    if (!this.validarCPF(this.$scope.cpf)) {
      this.alert.error('CPF inválido!')
      $('html, body').animate({ scrollTop: 0 }, 'fast')
      return
    }
    if (!/^(?=.*[0-9])(?=.*[a-zA-ZÇçÃãÂâÕõ¬¨ÄäËëÏïÖöÛû¹²³£¢¬§ªº])[\x20-\x7EÇçÃãÂâÕõ¬¨ÄäËëÏïÖöÛû¹²³£¢¬§ªº]+.{5,}$/.test(this.$scope.senha)) {
      this.alert.error('- A senha deverá ser composta no mínimo com 6 caracteres compostos de letras e números.')
      $('html, body').animate({ scrollTop: 0 }, 'fast')
      return
    }
    if (this.$scope.senha !== this.$scope.confirmarSenha) {
      this.alert.error('A senha e a confirmação de senha precisam ser iguais!')
      $('html, body').animate({ scrollTop: 0 }, 'fast')
      return
    }
    this.$scope.loading = true

    const body = {
      email: trim(this.$scope.email),
      nome: this.$scope.nome,
      cpf: cpfFunction.strip(this.$scope.cpf),
      senha: this.$scope.senha
    }
    this.$http.post(`${this.apiUrl}/signup/${this.preRegisterId}`, JSON.stringify(body), {
      transformRequest: angular.identity,
      headers: { 'Content-Type': 'application/json' }
    })
      .then(data => {
        this.$scope.loading = false

        this.alert.success('Cadastro concluído com sucesso')
        $('html, body').animate({ scrollTop: 0 }, 'fast')

        setTimeout(() => {
          this.authService.logout(true)
          window.location.pathname = '/'
        }, 2000)
      })
      .catch(error => {
        this.$scope.loading = false
        this.handlerError(error)
        // if (error) {
        //   if (error.error && error.error === 'recaptcha') {
        //     this.$scope.error = { message: 'Ocorreu um erro no recaptcha, por favor refaça a verificação "Não sou um robô".' }
        //   } else {
        //     this.$scope.error = error
        //   }
        // }
        setTimeout(() => {
          this.$scope.$apply()
        }, 1000)
        $('html, body').animate({ scrollTop: 0 }, 'fast')
      })
  }

  validarCPF (cpf) {
    cpf = cpf.replace(/[^\d]+/g, '')
    if (cpf === '') {
      return false
    }
    // Elimina CPFs invalidos conhecidos
    if (cpf.length !== 11 || cpf === '00000000000' || cpf === '11111111111' || cpf === '22222222222' || cpf === '33333333333' || cpf === '44444444444' || cpf === '55555555555' || cpf === '66666666666' || cpf === '77777777777' || cpf === '88888888888' || cpf === '99999999999') {
      return false
    }
    // Valida 1o digito
    let add = 0
    for (let i = 0; i < 9; i += 1) {
      add += parseInt(cpf.charAt(i), 10) * (10 - i)
    }

    let rev = 11 - add % 11
    if (rev === 10 || rev === 11) {
      rev = 0
    }
    if (rev !== parseInt(cpf.charAt(9), 10)) {
      return false
    }
    // Valida 2o digito
    add = 0
    for (let i = 0; i < 10; i += 1) {
      add += parseInt(cpf.charAt(i), 10) * (11 - i)
    }
    rev = 11 - add % 11
    if (rev === 10 || rev === 11) {
      rev = 0
    }
    if (rev !== parseInt(cpf.charAt(10), 10)) {
      return false
    }
    return true
  };

  handlerError (error) {
    this.alert.error(error?.message ? error?.message : error?.data ? error?.data.message : 'Ocorreu um erro inesperado!')
  }

  setRcNewInfoId (widgetId) {
    this.$scope.rcNewInfoId = widgetId
  };

  setRcNewDenuncia (widgetId) {
    this.$scope.rcNewDenuncia = widgetId
  };

  reloadRecaptcha (widgetId) {
    this.vcRecaptchaService.reload(widgetId)
  };
}

angular.module('eticca.public').controller('public.signup', [
  '$scope',
  '$timeout',
  '$http',
  '$routeParams',
  'reCaptchaService',
  'vcRecaptchaService',
  'alertService',
  'authService',
  'logoUrlService',
  ComplaintController
])

jQuery(() => {
  // $('#telefone').mask('(00) ? 0000-0000', { translation: { '?': { pattern: /[9]/, optional: true } }, clearIfNotMatch: true })
  readyFn.forEach((fn) => {
    return fn && (typeof fn === 'function') ? fn() : 0
  })
})
