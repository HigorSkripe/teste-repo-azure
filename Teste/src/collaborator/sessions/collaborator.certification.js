class Certification {
  constructor (resource, location, route, user, passos, storage, alert) {
    this.resource = resource
    this.location = location
    this.route = route
    this.user = user
    this.passos = passos
    this.storage = storage
    this.alert = alert
    this.appRef = 'COLLABORATOR'
    this.apiUrl = window.__API_URL
    this.questaoActive = 0
    this.questao = null
    this.provaVisivel = false
    this.creatingExam = false
    this.confirmado = true
    this.questoes = []
    this.prova = {}
    this.alertWarning = {
      type: 'warning',
      content: 'Sua prova foi iniciada mas não foi enviada!'
    }
    this._onInit()
  }

  _onInit () {
    this.creatingExam = true

    this.user.$promise
      .then((data) => {
        const provaNaoFinalizada = data.tentativaProvaNaoFinalizada

        if (provaNaoFinalizada) {
          this.showWarning = true
          this.provaVisivel = true
          this.resource(`${this.apiUrl}/prova/:id`, { id: '@id' }).get({ id: provaNaoFinalizada.id }).$promise.then((resp) => {
            this.prova = resp
            this.questoes = resp.questoes
          })
        } else {
          this.creatingExam = false
          this.provaVisivel = false
          this.showWarning = false
        }

        this.storage.set(this.user.id + '_' + this.user.idProgramaAtivo + '_provaClicked', true)
        return data
      })
      .catch(() => {
        this.creatingExam = false
      })
  }

  iniciarProva (provaStorage) {
    if (angular.isUndefined(provaStorage)) {
      return this.reqByServer()
    }
  }

  reqByServer () {
    this.creatingExam = true

    return this.resource(`${this.apiUrl}/prova/create`).save().$promise
      .then((resp) => {
        this.prova = resp
        this.questoes = resp.questoes
        this.startByServer()
        this.provaVisivel = true
        this.creatingExam = false
      })
      .catch((error) => {
        this.creatingExam = false
        this.alert.error(error?.message || error?.data?.message || 'Ocorreu um erro inesperado!')
      })
  }

  startByServer () {
    return this.resource(`${this.apiUrl}/prova/iniciar`).save({
      id: this.prova.id,
      horaInicio: new Date()
    }).$promise
  }

  click () {
    if (!this.provaVisivel) {
      this.iniciarProva()
    }
  }

  questionValidate (questoes) {
    let r = true
    questoes.some((el) => {
      if (!el.resposta) {
        this.alert.error('Todas as questões precisam ser respondidas para concluir a prova!')
        r = false
        return true
      }
      return false
    })
    return r
  }

  concluir () {
    const questoes = []

    this.prova.questoes.forEach((el) => {
      questoes.push({
        tentativaQuestaoId: el.id,
        resposta: el.resposta
      })
    })

    if (!this.questionValidate(questoes)) {
      return
    }

    /* POST DE ENVIO DAS RESPOSTAS PARA CORREÇÃO */
    this.resource(`${this.apiUrl}/prova/terminarprova`).save({
      questoes: questoes,
      horaTermino: new Date(),
      tentativaProvaId: this.prova.id
    }).$promise
      .then((resp) => {
        this.qtdAcertos = 0
        this.correcao = resp.questoes.map((el) => {
          if (el.acertou) {
            this.qtdAcertos += 1
          }

          return {
            acertou: el.acertou,
            resposta: el.resposta,
            enunciado: el.questao.enunciado,
            respostaCerta: el.questao.respostaCerta
          }
        })

        this.nota = Math.round(this.qtdAcertos / this.correcao.length * 100) / 10
        // body do passo quando chamar a rota de conclusão do passo
        this.passos.body = { prova: resp.id }

        if (this.nota >= 8) {
          this.passos.adicionar(this.location.path().split('/')[2])
          this.storage.remove(this.user.id + '_provaClicked')
        }

        this.user.tentativasProvasFinalizadas.unshift(resp)
        this.user.tentativaProvaNaoFinalizada = undefined
      })
      .catch(() => {})

    this.user.concluiuProva = true
    this.provaVisivel = false
    this.creatingExam = false
    this.provaConcluida = true
  }

  changeRadio () {
    /* POST DE ENVIO DAS RESPOSTAS PARA CORREÇÃO */
    const questao = this.prova.questoes[this.questaoActive]
    return this.resource(`${this.apiUrl}/prova/questao/resposta/salvar`).save(questao).$promise
  }

  nextQuestion () {
    const $question = $('#question')
    if (this.questaoActive < this.questoes.length - 1) {
      $question.fadeOut(0, () => {
        this.questaoActive += 1
        $question.fadeIn(200)
      })
    }
  }

  prevQuestion () {
    const $question = $('#question')
    if (this.questaoActive > 0) {
      $question.fadeOut(0, () => {
        this.questaoActive -= 1
        $question.fadeIn(200)
      })
    }
  }

  goToQuestion (index) {
    this.questaoActive = index
  }

  tentarNovamente () {
    this.route.reload()
  }
}

angular.module('eticca.collaborator').controller('certification', [
  '$resource',
  '$location',
  '$route',
  'userService',
  'passos',
  'localStorageService',
  'alertService',
  Certification
])
