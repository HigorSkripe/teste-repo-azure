import { equals } from 'angular'
import moment from 'moment'
import { includes } from 'ramda'

class Questions {
  constructor (resource, timeout, cloudSearchQuery, alert, user, localStorage) {
    this.resource = resource
    this.timeout = timeout
    this.cloudSearchQuery = cloudSearchQuery
    this.alert = alert
    this.user = user
    this.localStorage = localStorage
    this.apiUrl = window.__API_URL
    this.appRef = 'ADMIN'
    this.removeObj = null
    this.questaoResource = this.resource(`${this.apiUrl}/questao/:id/:versao`,
      {
        id: '@id',
        versao: '@versao'
      },
      {
        query: {
          method: 'GET',
          isArray: true
        },
        create: { method: 'POST' },
        update: { method: 'PUT' },
        delete: { method: 'DELETE' }
      })
    this.pagination = {
      search: '',
      grupoId: '',
      limit: 50,
      totalPages: 0,
      page: 0,
      range: [],
      list: [],
      orderBy: {
        key: 'versioning_version',
        order: 'desc'
      },
      order: {
        predicate: 'versioning_version',
        reverse: true
      },
      next: this.nextPage.bind(this),
      prev: this.previousPage.bind(this),
      goTo: this.goToPage.bind(this)
    }
    this.modalForm = {
      error: '',
      title: '',
      doing: '',
      button: '',
      model: {
        id: '',
        nome: '',
        versao: '',
        descricao: '',
        copyContent: false // isAtivo: true,
      },
      order: {
        predicate: 'enunciado',
        reverse: true
      },
      validations: {},
      clearModalForm: this.clearModalForm.bind(this),
      orderBy: this.orderByModalForm.bind(this),
      open: this.openModalForm.bind(this),
      save: this.saveModalForm.bind(this)
    }
    this.versaoDetail = null
    this.questoes = []
    this.search = ''
    this.modalQuestao = {
      doing: '',
      error: '',
      model: {},
      resp: {
        key: null,
        text: '',
        clear: this.clearRespModalQuestao.bind(this),
        delete: this.deleteRespModalQuestao.bind(this),
        edit: this.editRespModalQuestao.bind(this)
      },
      title: '',
      addResp: this.addRespModalQuestao.bind(this),
      clear: this.clearModalQuestao.bind(this),
      delete: this.deleteQuestao.bind(this),
      open: this.openModalQuestao.bind(this),
      save: this.saveModalQuestao.bind(this)
    }
    this._onInit()
  }

  _onInit () {
    const params = {
      entity: 'usergroup',
      page: this.pagination.page,
      limit: this.pagination.limit
    }
    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then((data) => {
        this.selectedGrupo = JSON.parse(localStorage.getItem('userGroupId')) || ''
        this.dropGrupo = data.data
        this.update()
      })
      .catch(this.handleError.bind(this))
  }

  update () {
    this.pagination.grupoId = this.selectedGrupo
    this.goToPage(0, true)
  }

  orderBy (predicate) {
    this.pagination.orderBy = {
      key: predicate,
      order: this.pagination.order.reverse ? 'desc' : 'asc'
    }
    this.goToPage(0, false, true)
    this.pagination.order.reverse = this.pagination.order.predicate !== predicate ? false : !this.pagination.order.reverse
    this.pagination.order.predicate = predicate
  }

  goToPage (page, first, ordering) {
    if (this.pagination.page === page && !first && !ordering) {
      return
    }

    this.pagination.page = page

    return this.applyPagination()
  }

  pesquisar (searchText) {
    return this.applyPagination(searchText)
  }

  previousPage () {
    if (this.pagination.page === 0) {
      return
    }

    this.pagination.page -= 1

    return this.applyPagination()
  }

  nextPage () {
    if (this.pagination.page === this.pagination.totalPages - 1) {
      return
    }

    this.pagination.page += 1

    return this.applyPagination()
  }

  applyPagination (search) {
    const queryFields = [['versioning_type', 'questao'], ['versioning_group_id', this.pagination.grupoId]]

    if (search) {
      queryFields.push(['versioning_name', `"${search}"`])
    }

    const params = {
      entity: 'versioning',
      page: this.pagination.page,
      limit: this.pagination.limit,
      query: queryFields,
      sort: `${this.pagination.orderBy.key} ${this.pagination.orderBy.order}`
    }

    this.pagination.list = []

    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then(this.successQuestions.bind(this))
      .catch(this.errorQuestions.bind(this))
  }

  successQuestions (data) {
    this.pagination.list = data.data
    this.pagination.totalPages = data.totalPages
    this.pagination.page = data.page
    this.pagination.range = Array.apply(null, Array(data.totalPages)).map((_, i) => {
      return i
    })
  }

  errorQuestions (error) {
    this.alert.error(error?.data?.message || 'Erro ao tentar obter as versões!')
  }

  addRespModalQuestao () {
    this.modalQuestao.model.respostas = angular.isUndefined(this.modalQuestao.model.respostas) ? [] : this.modalQuestao.model.respostas
    if (this.modalQuestao.resp.key !== null) {
      this.modalQuestao.model.respostas[this.modalQuestao.resp.key] = this.modalQuestao.resp.text
      if (this.modalQuestao.resp._bkp === this.modalQuestao.model.respostaCerta) {
        this.modalQuestao.model.respostaCerta = this.modalQuestao.resp.text
      }
    } else {
      this.modalQuestao.model.respostas.push(this.modalQuestao.resp.text)
    }
    this.modalQuestao.resp.clear()
  }

  editRespModalQuestao (key) {
    this.modalQuestao.resp.key = key
    this.modalQuestao.resp.text = angular.copy(this.modalQuestao.model.respostas[key])
    this.modalQuestao.resp._bkp = angular.copy(this.modalQuestao.model.respostas[key])
  }

  catchModalQuestao (error) {
    this.modalQuestao.error = error.data ? error.data.message : 'Ocorreu um erro inesperado!'
  }

  catchQuestao (error) {
    this.alert.error(error && error.data ? error.data.message : 'Erro ao tentar obter as questões!')
  }

  clearModalQuestao () {
    this.modalQuestao.doing = ''
    this.modalQuestao.model = {}
    this.modalQuestao.resp.clear()
  }

  clearRespModalQuestao () {
    this.modalQuestao.resp.key = null
    this.modalQuestao.resp.text = ''
  }

  createQuestao (body) {
    /* istanbul ignore next */
    body.versaoId = this.lastSelectedVersaoId
    this.questaoResource.create(body).$promise
      .then((data) => {
        this.questoes.push(data)
        this.alert.success('Questão "' + data.nome + '" criada com sucesso!')
        $('#modalQuestao').modal('hide')
      })
      .catch(this.catchModalQuestao.bind(this))
  }

  deleteQuestao () {
    const questao = this.modalQuestao.model
    this.resource(`${this.apiUrl}/questao/${questao.id}/${this.lastSelectedVersaoId}`, null).delete(questao).$promise
      .then((data) => {
        this.questoes.some((el, i) => {
          if (el.id === questao.id) {
            this.pagination.list.splice(i, 1)
            return true
          }

          return false
        })
        this.alert.success('Questão "' + data.nome + '" apagada com sucesso!')
        $('#modalQuestao').modal('hide')
      })
      .catch(this.catchQuestao.bind(this))
  }

  deleteRespModalQuestao (key) {
    this.modalQuestao.model.respostas.splice(key, 1)
  }

  openModalQuestao (questao, doing) {
    this.modalQuestao.clear()
    this.modalQuestao.model = angular.isUndefined(questao) || !questao ? {} : angular.copy(questao)
    this.modalQuestao.doing = doing
    $('#modalDetail').modal('hide')
    $('#modalQuestao').modal('show')
    if (doing === 'update') {
      this.modalQuestao.model.respostas.push(this.modalQuestao.model.respostaCerta)
      this.modalQuestao.title = 'Detalhes da questão "' + questao.id + '"'
      return
    }
    this.modalQuestao.title = 'Nova questão'
  }

  saveModalQuestao () {
    this.modalQuestao.model.respostas.some((resp, i) => {
      if (resp === this.modalQuestao.model.respostaCerta) {
        this.modalQuestao.model.respostas.splice(i, 1)
        return true
      }
      return false
    })
    return this.modalQuestao.doing === 'create' ? this.createQuestao(this.modalQuestao.model) : this.updateQuestao(this.modalQuestao.model)
  }

  successQuestao (data) {
    this.pagination.list = data.data
    this.pagination.totalPages = data.totalPages
    this.pagination.page = data.page
    this.pagination.range = Array.apply(null, Array(data.totalPages)).map((_, i) => {
      return i
    })
  }

  updateQuestao (questao) {
    this.resource(`${this.apiUrl}/questao/` + questao.id + '/' + this.lastSelectedVersaoId, null, { update: { method: 'PUT' } }).update(questao).$promise
      .then((data) => {
        this.questoes.map((item) => {
          if (item.id === data.id) {
            return {
              ...item,
              nome: data.nome,
              enunciado: data.enunciado,
              respostas: data.respostas,
              respostaCerta: data.respostaCerta
            }
          }

          return item
        })
        this.alert.success('Questão "' + data.id + '" salva com sucesso!')
        $('#modalQuestao').modal('hide')
      })
      .catch(this.catchModalQuestao.bind(this))
  }

  viewVersao (event, versaoQuestao) {
    this.versaoDetail = angular.copy(versaoQuestao)
    this.lastSelectedVersaoId = this.versaoDetail.id

    this.resource(`${this.apiUrl}/versaoquestao/${this.versaoDetail.id}`).get().$promise
      .then((data) => {
        this.versaoDetail = data
        this.questoes = data.questoes
        $('#modalDetail').modal('show')
      })
      .catch(error => {
        this.alert.error(error?.data?.message || 'Erro ao tentar obter os dados da versão!')
      })
  }

  orderByModalForm (predicate) {
    this.modalForm.order.reverse = this.modalForm.order.predicate !== predicate ? false : !this.modalForm.order.reverse
    this.modalForm.order.predicate = predicate

    if (includes(predicate, ['enunciado', 'nome'])) {
      this.questoes.sort((a, b) => a[predicate] > b[predicate] ? 1 : -1)
    } else if (equals(predicate, 'insertedAt')) {
      this.questoes.sort((a, b) => moment(a.insertedAt).isAfter(b.insertedAt) ? 1 : -1)
    }
  }

  openModalForm (doing, title, btn, versao) {
    $('#modalDetail').modal('hide')
    $('#versao').prop('disabled', false)
    $('#copyContent').prop('disabled', false)
    this.clearModalForm()
    this.modalForm.doing = doing
    this.modalForm.title = title
    this.modalForm.button = btn
    if (doing !== 'edit') {
      this.resource(`${this.apiUrl}/versaoquestao/sugestao?grupoId=` + this.selectedGrupo).get().$promise
        .then((data) => {
          this.modalForm.model.versao = data.versaoSugerida
          this.isPrimeiraVersao = data.primeiraVersao
        })
    }
    $('#modalForm').modal('show')
    if (angular.isDefined(versao)) {
      this.modalForm.model.id = versao.id
      this.modalForm.model.nome = versao.nome
      this.modalForm.model.versao = versao.versao
      this.modalForm.model.copyContent = versao.copyContent
      $('#versao').prop('disabled', true)
      $('#copyContent').prop('disabled', true)
      this.modalForm.model.descricao = versao.descricao
    }
  }

  clearModalForm () {
    for (const i in this.modalForm.model) {
      this.modalForm.model[i] = typeof this.modalForm.model[i] === 'boolean' ? false : ''
    }
    this.modalForm.error = ''
    this.modalForm.validations = {}
  }

  saveModalForm () {
    this.modalForm.error = ''
    if (!this.validationForm()) {
      return
    }
    return this.modalForm.doing === 'new' ? this.createNew() : this.saveEdit()
  }

  createNew () {
    const body = {}
    for (const i in this.modalForm.model) {
      if (this.modalForm.model[i]) {
        body[i] = this.modalForm.model[i]
      }
    }
    body.grupoId = this.selectedGrupo
    this.resource(`${this.apiUrl}/versaoquestao`).save(body).$promise
      .then((data) => {
        this.pagination.list.unshift(data)
        this.alert.success('Versão "' + data.nome + '" criada com sucesso!')
        $('#modalForm').modal('hide')
      })
      .catch((error) => {
        this.modalForm.error = error.data ? error.data.message : 'Ocorreu um erro inesperado!'
        this.handleError(error)
      })
  }

  saveEdit () {
    const body = {}
    for (const i in this.modalForm.model) {
      if (angular.isDefined(this.modalForm.model[i])) {
        body[i] = this.modalForm.model[i]
      }
    }
    body.grupoId = this.selectedGrupo
    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/versaoquestao/` + this.modalForm.model.id, null, { update: { method: 'PUT' } }).update(body).$promise
      .then((data) => {
        this.pagination.list.map((versao) => {
          if (versao.id === data.id) {
            versao.nome = data.nome
            versao.descricao = data.descricao
          }
          return versao
        })
        this.alert.success('Versão "' + this.modalForm.model.nome + '" atualizada com sucesso!')
        this.versaoDetail = null
        $('#modalForm').modal('hide')
      })
      .catch((error) => {
        this.modalForm.error = error.data ? error.data.message : 'Ocorreu um erro inesperado!'
        this.handleError(error)
      })
  }

  validationForm () {
    let isValid = true
    this.modalForm.validations = {}
    if (!this.modalForm.model.nome) {
      isValid = false
      this.modalForm.validations.nome = 'Campo requerido!'
    }
    if (!this.modalForm.model.versao) {
      isValid = false
      this.modalForm.validations.versao = 'Campo requerido!'
    }
    return isValid
  }

  handleError (error) {
    this.alert.error(error && error.data && error.data.message ? error.data.message : 'Ocorreu um erro inesperado!')
  }

  remove (obj) {
    this.removeObj = obj
  }

  confirmRemove (resp) {
    if (resp) {
      this.resource(`${this.apiUrl}/versaoquestao/` + this.removeObj.id).delete().$promise
        .then(() => {
          this.pagination.list.some((el, i) => {
            if (el.id === this.removeObj.id) {
              this.pagination.list.splice(i, 1)
              return true
            }

            return false
          })

          this.alert.success('Questões removidas com sucesso')
        })
        .catch(this.handleError.bind(this))
      return
    }
    return this.timeout(() => {
      this.removeObj = null
    }, 200)
  }
}

angular.module('eticca.admin').controller('admin.questions', [
  '$resource',
  '$timeout',
  'cloudSearchQuery',
  'alertService',
  'userService',
  'storageService',
  Questions
])
