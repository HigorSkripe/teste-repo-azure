class Faq {
  constructor (resource, timeout) {
    this.resource = resource
    this.timeout = timeout
    this.apiUrl = window.__API_URL
    this.appRef = 'COLLABORATOR'
    this.list = []
    this.search = ''
    this._onInit()
  }

  _onInit () {
    this.resource(`${this.apiUrl}/faq/list`).query().$promise
      .then((resp) => {
        this.list = resp
      })
  }
}

angular.module('eticca.collaborator').controller('faq', [
  '$resource',
  '$timeout',
  Faq
])
