class ForgotController {
  constructor ($scope, $http, logoUrlService) {
    this.$scope = $scope
    this.$http = $http
    this.logoUrlService = logoUrlService

    this.srcLogo = this.logoUrlService.getUrlLogo()

    this._onInit()
  }

  _onInit () {
    this.$scope.send = this.send.bind(this)
  }

  async send () {
    const pass = $('#senha').val()
    const confirm = $('#confirmaSenha').val()
    this.$scope.error = null

    if (!pass.length) {
      this.$scope.error = { message: 'Digite sua nova senha!' }
      $('html, body').animate({ scrollTop: 0 }, 'fast')
      return
    }
    if (!/^(?=.*[0-9])(?=.*[a-zA-ZÇçÃãÂâÕõ¬¨ÄäËëÏïÖöÛû¹²³£¢¬§ªº])[\x20-\x7EÇçÃãÂâÕõ¬¨ÄäËëÏïÖöÛû¹²³£¢¬§ªº]+.{5,}$/.test(pass)) {
      this.$scope.error = { message: '- A senha deverá ser composta no mínimo com 6 caracteres compostos de letras e números.' }
      $('html, body').animate({ scrollTop: 0 }, 'fast')
      return
    }
    if (pass !== confirm) {
      this.$scope.error = { message: 'Senhas diferentes informadas, por favor revise!' }
      $('html, body').animate({ scrollTop: 0 }, 'fast')
      return
    }
    try {
      await this.$http.post(window.location.pathname, { senha: pass })
      this.$scope.error = null
      $('html, body').animate({ scrollTop: 0 }, 'fast')
      window.location.replace('/auth/login?message=forgot')
    } catch (error) {
      const message = error?.data?.message ? error.data.message : 'Ocorreu um erro inesperado, por favor tente novamente.'
      this.$scope.$apply(() => {
        this.$scope.error = { message }
      })
      $('html, body').animate({ scrollTop: 0 }, 'fast')
    }
  }
}

angular.module('eticca.auth').controller('forgot', ['$scope', '$http', 'logoUrlService', ForgotController])
