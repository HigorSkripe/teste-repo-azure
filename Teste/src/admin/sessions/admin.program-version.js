class ProgramVersion {
  constructor (resource, cloudSearchQuery, scope, alert, user, localStorage) {
    this.resource = resource
    this.cloudSearchQuery = cloudSearchQuery
    this.scope = scope
    this.alert = alert
    this.user = user
    this.localStorage = localStorage
    this.apiUrl = window.__API_URL
    this.appRef = 'ADMIN'
    this.versaoDetail = null
    this.versaoSave = {
      id: '',
      nome: '',
      versao: '',
      itens: {
        documento: '',
        questao: ''
      },
      descricao: '',
      notificarColaboradores: false
    }
    this.pagination = {
      search: '',
      grupoId: '',
      limit: 50,
      totalPages: 0,
      page: 0,
      list: [],
      range: [],
      orderBy: {
        key: 'program_version',
        order: 'desc'
      },
      order: {
        predicate: 'program_version',
        reverse: true
      },
      next: this.nextPage.bind(this),
      prev: this.previousPage.bind(this),
      goTo: this.goToPage.bind(this)
    }
    this.dropDocumento = []
    this.dropQuestao = []
    this.dropTreinamento = []
    this.search = ''
    this.modalForm = {
      title: '',
      doing: '',
      button: '',
      model: {
        id: '',
        nome: '',
        versao: '',
        itens: {
          documento: '',
          questao: ''
        },
        descricao: '',
        notificarColaboradores: false
      },
      validations: {},
      clearModalForm: this.clearModalForm.bind(this),
      open: this.openModalForm.bind(this),
      save: this.saveModalForm.bind(this),
      buscarDrops: this.buscarDrops.bind(this)
    }
    this.order = {
      predicate: 'nome',
      reverse: false
    }
    this.orderByObj = {}
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

  handleError (error) {
    this.alert.error(error && error.message ? error.message : error.data && error.data.message ? error.data.message : 'Ocorreu um erro inesperado!')
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
    this.pagination.page = 0

    return this.applyPagination(searchText ? (searchText.indexOf('*') >= 0 ? '' : `*${searchText}*`) : '')
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
    const queryFields = [['program_group_id', this.pagination.grupoId], ['(enabled', `${1} OR`], ['enabled', `${0})`]]

    if (search) {
      queryFields.push(['program_name', `"${search}"`])
    }

    const params = {
      entity: 'program',
      page: this.pagination.page,
      limit: this.pagination.limit,
      query: queryFields,
      sort: `${this.pagination.orderBy.key} ${this.pagination.orderBy.order}`
    }

    this.pagination.list = []

    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then(this.successPrograms.bind(this))
      .catch(this.errorPrograms.bind(this))
  }

  successPrograms (data) {
    this.pagination.list = data.data
    this.pagination.totalPages = data.totalPages
    this.pagination.page = data.page
    this.pagination.range = Array.apply(null, Array(data.totalPages)).map((_, i) => {
      return i
    })

    // Get the program active whenever fetching a page of data
    const programActive = this.pagination.list.find(program => program.active)
    this.programaVigente = programActive || this.programaVigente
  }

  errorPrograms (error) {
    this.alert.error(error?.data?.message || 'Erro ao tentar obter as versões!')
  }

  clearModalForm () {
    for (const i in this.versaoSave) {
      this.versaoSave[i] = typeof this.versaoSave[i] === 'boolean' ? false : ''
    }
    this.selectedVDoc = ''
    this.selectedVQues = ''
    this.selectedVTrei = ''
    this.modalForm.validations = {}
  }

  viewVersao (event, versao) {
    this.versaoDetail = angular.copy(versao)
    this.dropQuestao = []
    this.dropDocumento = []
    this.dropTreinamento = []

    this.buscarDrops(versao.versao)
      .then(() => this.resource(`${this.apiUrl}/programa/byid/${versao.id}`).get().$promise)
      .then((data) => {
        this.versaoDetail = data
        this.versaoDetail.documentoSelecionado = this.getVersionamentoInfo(this.dropDocumento, this.versaoDetail.itens.documento)
        this.versaoDetail.questaoSelecionado = this.getVersionamentoInfo(this.dropQuestao, this.versaoDetail.itens.questao)
        this.versaoDetail.treinamentoSelecionado = this.getVersionamentoInfo(this.dropTreinamento, this.versaoDetail.itens.treinamento)
        $('#modalFormInfo').modal('show')
      })
      .catch(error => {
        this.alert.error(error?.data?.message || 'Erro ao tentar obter os dados do Programa!')
      })
  }

  openModalForm (doing, title, btn) {
    this.clearModalForm()
    $('#versao').prop('disabled', false)
    this.modalForm.doing = doing
    this.modalForm.title = title
    this.modalForm.button = btn

    if (angular.isDefined(this.versaoDetail)) {
      if (doing === 'edit' || doing === 'active') {
        $('#versao').prop('disabled', true)

        this.versaoSave = angular.copy(this.versaoDetail)

        this.selectedVDoc = this.versaoSave.itens.documento
        this.selectedVQues = this.versaoSave.itens.questao
        this.selectedVTrei = this.versaoSave.itens.treinamento
      }
    }

    this.versaoSave.activing = doing !== 'edit'

    $('#modalFormInfo').modal('hide')
    $('#modalForm').modal('show')
  }

  getVersionamentoInfo (lst, id) {
    const versionamento = lst.find(a => a.id === id)

    if (!versionamento) return ''

    return `${versionamento.versao} - ${versionamento.nome}`
  }

  buscarDrops (versao) {
    const versoes = (versao || '').split('.').filter(el => !!el)

    if (versoes.length < 2) return

    return this.resource(`${this.apiUrl}/programa/` + versao + '?grupoId=' + this.selectedGrupo).get().$promise
      .then((data) => {
        this.dropDocumento = data.documento
        this.dropQuestao = data.questao
        this.dropTreinamento = data.treinamento
      })
  }

  saveModalForm () {
    if (!this.validationModalForm()) {
      return
    }
    return this.createNew()
  }

  createNew () {
    const body = {
      id: this.versaoSave.id || '1',
      nome: this.versaoSave.nome,
      versao: this.versaoSave.versao,
      descricao: this.versaoSave.descricao,
      grupoId: this.selectedGrupo,
      itens: {
        documento: this.selectedVDoc,
        questao: this.selectedVQues,
        treinamento: this.selectedVTrei
      },
      activing: this.versaoSave.activing,
      notificarColaboradores: !this.versaoSave.activing ? false : !!this.versaoSave.notificarColaboradores
    }

    this.resource(`${this.apiUrl}/programa`).save(body).$promise
      .then((data) => {
        // Verificando se já temos o programa salvo e atualizamos as informações...
        const updateVersion = this.pagination.list.some((versao) => {
          if (versao.id === data.id) {
            versao = data
            return true
          } else {
            versao.active = false
          }
          return false
        })

        // ...senão, indica que é um novo programa e o adicionamos na lista.
        if (!updateVersion) {
          this.pagination.list.unshift(data)
        }

        this.alert.success(`Versão "${data.nome}" ${this.versaoSave.activing ? 'ativada' : 'atualizada'} com sucesso!`)
        $('#modalForm').modal('hide')

        if (this.versaoSave.activing) {
          this.programaVigente = data
        }
      }, (error) => {
        this.alert.error(error && error.data ? error.data.message : 'Ocorreu um erro inesperado!')
      })
      .catch((error) => {
        this.alert.error(error && error.data ? error.data.message : 'Ocorreu um erro inesperado!')
      })
  }

  validationModalForm () {
    let isValid = true
    this.modalForm.validations = {}
    if (!this.versaoSave.nome) {
      isValid = false
      this.modalForm.validations.nome = 'Campo requerido!'
    }
    if (!this.versaoSave.versao) {
      isValid = false
      this.modalForm.validations.versao = 'Campo requerido!'
    }
    return isValid
  }
}

angular.module('eticca.admin').controller('admin.program-version', [
  '$resource',
  'cloudSearchQuery',
  '$scope',
  'alertService',
  'userService',
  'storageService',
  ProgramVersion
])
