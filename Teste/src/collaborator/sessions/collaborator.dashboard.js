class Dashboard {
  constructor (scope, location, timeout, resource, http, steps, term, user, storage, alert, documentService) {
    this.scope = scope
    this.location = location
    this.timeout = timeout
    this.resource = resource
    this.http = http
    this.steps = steps
    this.term = term
    this.user = user
    this.storage = storage
    this.alert = alert
    this.documentService = documentService
    this.apiUrl = window.__API_URL
    this.appRef = 'COLLABORATOR'
    this.userProgresses = []
    this.programaAtivo = {}

    this._onInit()
  }

  _onInit () {
    const alert = this.alert

    this.progress = {
      datapoints: [],
      datacolumns: [{
        id: 'progresso',
        type: 'gauge',
        name: 'Progresso'
      }]
    }

    this.startWithOldProgramValue = false
    this.ultimasProvas = []

    this.term.dashboard.then((res) => {
      this.message = res.result
    })

    this.user.$promise
      .then(user => Promise.all([this.user.refresh(user), this.documentService.getDocuments()]))
      .then(([user, documentos]) => {
        this.keyIntro = this.documentService.getDocumentTitle('intro', documentos)
        this.keyCEtica = this.documentService.getDocumentTitle('codigo_etica', documentos)
        this.keyCConduta = this.documentService.getDocumentTitle('codigo_conduta', documentos)
        this.keyTerm = this.documentService.getDocumentTitle('termo_aceite', documentos)

        return user
      })
      .then(async (data) => {
        this.user.refreshNaoConcluidas()
        this.progress.datapoints.push({ progresso: Math.round(this.user.numEtapasConcluidas / this.user.totalEtapas * 100 * 100) / 100 })
        this.user.tentativasProvasFinalizadas = this.user.tentativasProvasFinalizadas.sort((a, b) => {
          return -(new Date(a.horaTerminoCliente) - new Date(b.horaTerminoCliente))
        })
        this.user.tentativasProvasFinalizadas.some((prova, i) => {
          if (prova) {
            prova.horaTerminoCliente = new Date(prova.horaTerminoCliente)
            prova.questoesAcertadas = 0
            prova.questoes.forEach((questao) => {
              if (questao.acertou) {
                prova.questoesAcertadas += 1
              }
            })
            prova.nota = Math.round(prova.questoesAcertadas / prova.questoes.length * 100) / 10
            this.ultimasProvas.push(prova)
          }
          return i === 2
        })

        this.resource(`${this.apiUrl}/programa/ativo?grupoId=${data.grupoId}`).get().$promise
          .then((programaAtivo) => {
            this.user.idProgramaAtivo = programaAtivo.id
            this.programaAtivo = programaAtivo
          })
          .catch(function (error) {
            console.error(error && error.message ? error.message : error && error.data && error.data.message ? error.data.message : 'Não foi possível buscar o programa ativo')
            alert.error('Não foi possível buscar o programa ativo')
          })

        this.userProgresses = await this.resource(`${this.apiUrl}/usuario/progressos`).get().$promise
          .then(data => data.progressos)
          .catch(function (error) {
            console.error(error && error.message ? error.message : error && error.data && error.data.message ? error.data.message : 'Não foi possível buscar seus progressos nos treinamentos')
            alert.error('Não foi possível buscar seus progressos nos treinamentos')
            return []
          })

        return data
      })

    angular.element(document)
      .ready(() => {
        const termIsReject = this.storage.get(this.user.id + '_' + this.user.idProgramaAtivo + '_term-reject')
        const modal$ = $('#modalTermReject')

        if (termIsReject) {
          modal$.modal('show')
        }

        modal$.on('hide.bs.modal', () => {
          this.storage.remove(this.user.id + '_term-reject')
        })
      })
  }

  getStatusMessage () {
    const messages = {
      iniciar: 'Iniciar',
      continuar: 'Continuar de onde parou',
      avancar: 'Avançar para o próximo programa'
    }

    if (this.user.numEtapasConcluidas < 1 || this.user.numEtapasConcluidas > this.user.totalEtapas) return messages.iniciar

    if (this.startWithOldProgram()) return this.user.numEtapasConcluidas === this.user.totalEtapas ? messages.avancar : messages.continuar

    return messages.continuar
  }

  goTo () {
    if (this.startWithOldProgram() && this.user.numEtapasConcluidas === 6) {
      return this.goToNextProgram()
    } else {
      const steps = ['introducao', 'treinamento', 'codigoetica', 'codigoconduta', 'certificacao', 'termoaceite']
      const currentStep = steps.find(step => !this.user.etapasConcluidas[step]) || steps[0]

      this.steps.pos(currentStep)
        .then((resp) => {
          this.location.path(`/app/${resp.cur.route}`)
        })
    }
  }

  async goToNextProgram () {
    try {
      await this.http.post(`${this.apiUrl}/usuario/nextprogram`, {})
      window.location.reload(true)
    } catch (error) {
      this.alert.error(error?.message || error?.data?.message || 'Não foi possível avançar para o próximo programa de treinamento')
    }
  }

  showStatusButton () {
    const { numEtapasConcluidas = 0, totalEtapas = 6 } = this.user

    this.startWithOldProgramValue = this.startWithOldProgram() && numEtapasConcluidas === totalEtapas

    return this.startWithOldProgramValue
  }

  startWithOldProgram () {
    const { startOldProgram = false, selectedPrograms = [] } = this.user

    return startOldProgram && selectedPrograms.length
  }

  backTermo () {
    this.timeout(() => {
      this.location.path('/app/termoaceite')
    }, 250)
  }
}

angular.module('eticca.collaborator').controller('dashboard', [
  '$scope',
  '$location',
  '$timeout',
  '$resource',
  '$http',
  'steps',
  'term',
  'userService',
  'localStorageService',
  'alertService',
  'documentService',
  Dashboard
])
