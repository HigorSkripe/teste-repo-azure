class CodeOfEthics {
  constructor (location, term, passos) {
    this.location = location
    this.term = term
    this.passos = passos
    this.appRef = 'COLLABORATOR'
    this._onInit()
  }

  _onInit () {
    this.term.codigoEtica.then((response) => {
      this.termo = response.result
      this.passos.adicionar(this.location.path().split('/')[2])
    })
  }
}

angular.module('eticca.collaborator').controller('codeOfEthics', [
  '$location',
  'term',
  'passos',
  CodeOfEthics
])
