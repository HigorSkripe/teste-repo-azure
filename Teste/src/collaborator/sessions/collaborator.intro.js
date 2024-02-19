class Intro {
  constructor (location, term, passos) {
    this.location = location
    this.term = term
    this.passos = passos
    this.appRef = 'COLLABORATOR'
    this._onInit()
  }

  _onInit () {
    this.term.introducao.then((response) => {
      this.message = response.result
      this.passos.adicionar(this.location.path().split('/')[2])
    })
  }
}

angular.module('eticca.collaborator').controller('intro', [
  '$location',
  'term',
  'passos',
  Intro
])
