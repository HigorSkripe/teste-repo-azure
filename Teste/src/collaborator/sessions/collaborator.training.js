class Training {
  constructor (location, timeout, http, passos, user, urlTraining) {
    this.location = location
    this.timeout = timeout
    this.http = http
    this.passos = passos
    this.user = user
    this.urlTraining = urlTraining
    this.appRef = 'COLLABORATOR'
    this.apiUrl = window.__API_URL
    this._onInit()
  }

  _onInit () {
    this.passos.adicionar(this.location.path().split('/')[2])
    this.treinamento = true
    this.globalError = null
    this.videos = []

    this.http.get(`${this.apiUrl}/versaotreinamento/videos`)
      .then((result) => {
        this.treinamento = true

        if (result) {
          if (result.data.type === 'MP4') {
            this.videos = result.data.links || []
          } else {
            const urlWithAccessToken = this.urlTraining.addAccessToken({ links: result.data.links, tipo: 'HTML' })
            this.timeout(() => {
              $('#curso').attr('src', urlWithAccessToken)
            }, 200)
          }
        } else {
          this.treinamento = false
          this.globalError = 'Não há nenhum programa atual para exibição do treinamento. Por favor entre em contato com um administrador!'
        }

        return result
      },
      (error) => {
        console.error(error)
        this.treinamento = false
        this.globalError = 'Ocorreu um erro inesperado! Tente novamente mais tarde.'
      }
      )
  }
}

angular.module('eticca.collaborator').controller('training', [
  '$location',
  '$timeout',
  '$http',
  'passos',
  'userService',
  'urlTraining',
  Training
])
