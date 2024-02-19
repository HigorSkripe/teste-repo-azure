class FaqController {
  constructor ($http, logoUrlService) {
    this.$http = $http
    this.logoUrlService = logoUrlService
    this.apiUrl = window.__API_URL

    this.list = []
    this.srcLogo = this.logoUrlService.getUrlLogo()

    this._onInit()
  }

  _onInit () {
    this.$http.get(`${this.apiUrl}/faq/list`).then((resp) => {
      this.list = resp.data
    }, function (error) {
      this.error = error.message || 'Ocorreu um erro inesperado!'
    })
  }
}

angular.module('eticca.public').controller('public.faq', ['$http', 'logoUrlService', FaqController])
