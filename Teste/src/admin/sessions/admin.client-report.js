class ClientReport {
  constructor (resource, alert, user) {
    this.resource = resource
    this.alert = alert
    this.user = user
    this.apiUrl = window.__API_URL
    this.appRef = 'ADMIN'
    this._onInit()
  }

  _onInit () {
    this.resource(`${this.apiUrl}/colaborador/report/clients`).get().$promise
      .then((data) => {
        this.dropClientes = data.clientes
      })
  }

  geraRelatorio () {
    this.rotaDoc = `/api/v1/colaborador/report/${this.selectedCliente}`
    window.open(this.rotaDoc, '_blank')
  }
}

angular.module('eticca.admin').controller('admin.client-report', [
  '$resource',
  'alertService',
  'userService',
  ClientReport
])
