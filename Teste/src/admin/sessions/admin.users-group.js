class UsersGroup {
  constructor (resource, cloudSearchQuery, scope, alert, user) {
    this.resource = resource
    this.cloudSearchQuery = cloudSearchQuery
    this.scope = scope
    this.alert = alert
    this.user = user
    this.apiUrl = window.__API_URL
    this.appRef = 'ADMIN'
    this.grupoDetail = null
    this.pagination = {
      search: '',
      limit: 50,
      totalPages: 0,
      page: 0,
      list: [],
      range: [],
      orderBy: {
        key: 'usergroup_name',
        order: 'asc'
      },
      order: {
        predicate: 'usergroup_name',
        reverse: false
      },
      next: this.nextPage.bind(this),
      prev: this.previousPage.bind(this),
      goTo: this.goToPage.bind(this)
    }
    this.modalForm = {
      title: '',
      doing: '',
      button: '',
      model: {
        id: '',
        nome: '',
        descricao: ''
      },
      validations: {},
      clearModalForm: this.clearModalForm.bind(this),
      open: this.openModalForm.bind(this),
      save: this.saveModalForm.bind(this),
      delete: this.deletegrupo.bind(this)
    }
    this._onInit()
  }

  _onInit () {
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
    const queryFields = []

    if (search) {
      queryFields.push(['usergroup_name', `"${search}"`])
    }

    const params = {
      entity: 'usergroup',
      page: this.pagination.page,
      limit: this.pagination.limit,
      query: queryFields,
      sort: `${this.pagination.orderBy.key} ${this.pagination.orderBy.order}`
    }

    this.pagination.list = []

    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then(this.successGroup.bind(this))
      .catch(this.errorGroup.bind(this))
  }

  successGroup (data) {
    this.pagination.list = data.data
    this.pagination.totalPages = data.totalPages
    this.pagination.page = data.page
    this.pagination.range = Array.apply(null, Array(data.totalPages)).map((_, i) => {
      return i
    })
  }

  errorGroup (error) {
    this.alert.error(error?.data?.message || 'Erro ao tentar obter os Grupos de Usuários')
  }

  clearModalForm () {
    for (const i in this.modalForm.model) {
      this.modalForm.model[i] = typeof this.modalForm.model[i] === 'boolean' ? false : ''
    }
    this.modalForm.validations = {}
  }

  openModalForm (doing, title, btn, grupo, $event) {
    if (event) {
      const id = 'del_' + grupo.id
      const atvId = 'atv_' + grupo.id
      if (event.target.getAttribute('id') === id || event.target.parentElement.getAttribute('id') === id || event.target.getAttribute('id') === atvId || event.target.parentElement.getAttribute('id') === atvId) {
        return
      }
    }

    this.clearModalForm()

    this.modalForm.doing = doing
    this.modalForm.title = title
    this.modalForm.button = btn

    $('#modalForm').modal('show')

    if (angular.isDefined(grupo.id)) {
      this.modalForm.model.id = grupo.id
      this.modalForm.model.nome = grupo.nome
      this.modalForm.model.descricao = grupo.descricao
    }
  }

  saveModalForm () {
    if (!this.validationModalForm()) {
      return
    }
    return this.modalForm.doing === 'new' ? this.createNew() : this.saveEdit()
  }

  validationModalForm () {
    let isValid = true
    this.modalForm.validations = {}
    if (!this.modalForm.model.nome) {
      isValid = false
      this.modalForm.validations.nome = 'Campo requerido!'
    }
    if (!this.modalForm.model.descricao) {
      isValid = false
      this.modalForm.validations.descricao = 'Campo requerido!'
    }
    return isValid
  }

  createNew () {
    const body = {}

    for (const i in this.modalForm.model) {
      if (this.modalForm.model[i]) {
        body[i] = this.modalForm.model[i]
      }
    }

    this.resource(`${this.apiUrl}/grupousuario`).save(body).$promise
      .then((data) => {
        this.pagination.list.push(data)
        this.alert.success('Grupo de Usuários "' + data.nome + '" criado com sucesso!')
        $('#modalForm').modal('hide')
      })
      .catch((error) => {
        this.alert.error(error?.data ? error.data.message : 'Ocorreu um erro inesperado!')
      })
  }

  saveEdit () {
    const body = {}
    for (const i in this.modalForm.model) {
      if (angular.isDefined(this.modalForm.model[i])) {
        body[i] = this.modalForm.model[i]
      }
    }
    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/grupousuario/` + this.modalForm.model.id, null, { update: { method: 'PUT' } }).update(body).$promise.then((data) => {
      this.pagination.list.map((grupo) => {
        if (grupo.id === data.id) {
          grupo.nome = data.nome
          grupo.descricao = data.descricao
        }
        return grupo
      })
      this.alert.success('Grupo de Usuários"' + this.modalForm.model.nome + '" atualizado com sucesso!')
      this.grupoDetail = null
      $('#modalForm').modal('hide')
    }).catch((error) => {
      this.alert.error(error?.data ? error.data.message : 'Ocorreu um erro inesperado!')
    })
  }

  deletegrupo (grupo) {
    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/grupousuario/` + grupo.id).delete().$promise
      .then((data) => {
        this.pagination.list.some((u, i) => {
          if (u.id === grupo.id) {
            this.pagination.list.splice(i, 1)
            this.alert.success('Grupo de Usuários deletada com sucesso!')
            return true
          }
          return false
        })
      })
      .catch((error) => {
        this.alert.error(error?.message || error?.data?.message || 'Ocorreu um erro inesperado!')
      })
  }

  viewgrupo (event, grupousuario) {
    this.grupoDetail = angular.copy(grupousuario)
    this.lastSelectedgrupoId = this.grupoDetail.id
    $('#modalForm').modal('show')
  }
}

angular.module('eticca.admin').controller('admin.users-group', [
  '$resource',
  'cloudSearchQuery',
  '$scope',
  'alertService',
  'userService',
  UsersGroup
])
