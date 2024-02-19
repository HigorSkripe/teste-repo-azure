class AcceptTerms {
  constructor (scope, location, http, timeout, steps, term, user, passos, storage, alert) {
    this.scope = scope
    this.location = location
    this.http = http
    this.timeout = timeout
    this.steps = steps
    this.term = term
    this.user = user
    this.passos = passos
    this.storage = storage
    this.alert = alert
    this.appRef = 'COLLABORATOR'
    this.apiUrl = window.__API_URL
    this.modalPerfil = {
      model: { id: '' },
      open: this.openModalForm
    }
    this.pdfName = 'eticca_termo.pdf'
    this.currentPath = this.location.path().split('/')[2]

    this.processing = false

    this._onInit()
  }

  _onInit () {
    this.user.$promise.then((data) => {
      this.aceito = this.user.naoConcluidas.indexOf(this.currentPath) === -1
      if (this.aceito) {
        this.aceitoData = new Date(this.user.etapasConcluidas[this.currentPath])
      }
      if (!this.storage.get(this.user.id + '_' + this.user.idProgramaAtivo + '_dataTermo')) {
        this.storage.set(this.user.id + '_' + this.user.idProgramaAtivo + '_dataTermo', new Date().getTime())
      }
      return data
    })

    this.term.termoAceite.then((response) => {
      this.termo = response.result
    })
  }

  startProcessing () {
    this.processing = true
  }

  finishProcessing () {
    this.processing = false
  }

  aceiteClick (r) {
    // Ignoring double-click
    if (this.processing) return

    this.startProcessing()

    if (!this.aceito && r) {
      if (this.verificaPassosConcluidos(this.user.etapasConcluidas)) {
        this.passos.body = { termoaceite: r }
        const addPassoPromise = this.passos.adicionar(this.currentPath)
        this.storage.remove(this.user.id + '_dataTermo')

        addPassoPromise
          .then((data) => {
            if (data && data.status >= 400) {
              this.alert.error(data?.message || data?.data?.message || 'Ocorreu um erro inesperado!')
            } else {
              this.aceito = true
              this.aceitoData = new Date(data.etapasConcluidas.termoaceite)
              $('#modalTermo').modal('show')
            }

            this.finishProcessing()
          })
          .catch((error) => {
            this.finishProcessing()
            this.alert.error(error?.message || error?.data?.message || 'Ocorreu um erro inesperado!')
          })
      } else {
        this.finishProcessing()
        this.alert.error('Para concordar com o termo primeiro deve-se passar por todas as etapas anteriores.')
      }
    } else {
      this.storage.set(this.user.id + '_' + this.user.idProgramaAtivo + '_term-reject', true)
      return this.location.path('/app/dashboard')
    }
  }

  verificaPassosConcluidos (etapa) {
    return etapa.introducao && etapa.certificacao && etapa.codigoconduta && etapa.codigoetica && etapa.treinamento
  }

  async downloadTermo () {
    try {
      const res = await this.http.get(`${this.apiUrl}/usuario/documento/download`)

      return this.http.get(res.data.url, { headers: { 'Content-Type': res.data.contentType }, responseType: 'arraybuffer' })
        .then(result => {
          const aLink = document.createElement('a')
          document.body.appendChild(aLink)

          const file = new Blob([result.data], { type: res.data.contentType })
          const fileURL = window.URL.createObjectURL(file)

          aLink.href = fileURL
          aLink.download = res.data.filename
          aLink.click()
          this.timeout(() => {
            document.body.removeChild(aLink)
          }, 2000)
        })
    } catch (error) {
      return this.handleError({ data: { message: 'Houve um erro na tentativa de baixar o termo de aceite. Tente novamente mais tarde.' } })
    }
  }

  async atualizaModal (download) {
    if (download) {
      await this.downloadTermo()
    } else {
      return setTimeout(() => {
        window.location.href = '/app/dashboard'
      }, 1000)
    }
  }

  handleError (error) {
    this.alert.error(error?.data?.message || 'Ocorreu um erro inesperado! Tente novamente mais tarde.')
  }

  openModalForm (doing, title, btn, user) {
    $('#modalDetail').modal('hide')
    this.modalForm.doing = doing
    this.modalForm.title = title
    this.modalForm.button = btn
    if (angular.isDefined(user)) {
      setTimeout(() => {
        $('#modalForm').modal('show')
      }, 400)
    }
  }
}

angular.module('eticca.collaborator').controller('acceptTerms', [
  '$scope',
  '$location',
  '$http',
  '$timeout',
  'steps',
  'term',
  'userService',
  'passos',
  'localStorageService',
  'alertService',
  AcceptTerms
])
