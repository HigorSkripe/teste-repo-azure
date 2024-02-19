class TranslateKeys {
  constructor (resource, cloudSearchQuery, scope, alert) {
    this.resource = resource
    this.cloudSearchQuery = cloudSearchQuery
    this.scope = scope
    this.alert = alert
    this.apiUrl = window.__API_URL
    this.appRef = 'ADMIN'
    this.chaveDetail = null
    this.pagination = {
      search: '',
      list: [],
      limit: 50,
      totalPages: 0,
      page: 0,
      range: [],
      orderBy: {
        key: 'translationkey_name',
        order: 'asc'
      },
      order: {
        predicate: 'translationkey_name',
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
        key: '',
        value: ''
      },
      validations: {},
      clearModalForm: this.clearModalForm.bind(this),
      open: this.openModalForm.bind(this),
      save: this.saveModalForm.bind(this),
      delete: this.deleteChave.bind(this)
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
      queryFields.push(['translationkey_value', `"${search}"`])
    }

    const params = {
      entity: 'translationkey',
      page: this.pagination.page,
      limit: this.pagination.limit,
      query: queryFields,
      sort: `${this.pagination.orderBy.key} ${this.pagination.orderBy.order}`
    }

    this.pagination.list = []

    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then(this.successChaves.bind(this))
      .catch(this.catchChaves.bind(this))
  }

  successChaves (data) {
    this.pagination.list = data.data
    this.pagination.totalPages = data.totalPages
    this.pagination.page = data.page
    this.pagination.range = Array.apply(null, Array(data.totalPages)).map((_, i) => {
      return i
    })
  }

  catchChaves (error) {
    this.alert.error(error?.data?.message || 'Erro ao tentar obter as versões!')
  }

  openModalForm (doing, title, btn, chave, $event) {
    if (event) {
      const id = 'del_' + chave.id
      const atvId = 'atv_' + chave.id
      if (event.target.getAttribute('id') === id || event.target.parentElement.getAttribute('id') === id || event.target.getAttribute('id') === atvId || event.target.parentElement.getAttribute('id') === atvId) {
        return
      }
    }
    this.clearModalForm()
    $('#key').prop('disabled', false)
    this.modalForm.doing = doing
    this.modalForm.title = title
    this.modalForm.button = btn
    $('#modalForm').modal('show')
    if (angular.isDefined(chave.id)) {
      this.modalForm.model.id = chave.id
      this.modalForm.model.key = chave.key
      $('#key').prop('disabled', true)
      this.modalForm.model.value = chave.value
    }
  }

  clearModalForm () {
    for (const i in this.modalForm.model) {
      this.modalForm.model[i] = typeof this.modalForm.model[i] === 'boolean' ? false : ''
    }
    this.modalForm.validations = {}
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
    if (!this.modalForm.model.key) {
      isValid = false
      this.modalForm.validations.key = 'Campo requerido!'
    }
    if (!this.modalForm.model.value) {
      isValid = false
      this.modalForm.validations.value = 'Campo requerido!'
    }
    return isValid
  }

  viewChave (event, chaveTraducao) {
    this.chaveDetail = angular.copy(chaveTraducao)
    this.lastSelectedChaveId = this.chaveDetail.id
    $('#modalForm').modal('show')
  }

  createNew () {
    const body = {}
    for (const i in this.modalForm.model) {
      if (this.modalForm.model[i]) {
        body[i] = this.modalForm.model[i]
      }
    }
    this.resource(`${this.apiUrl}/chavetraducao`).save(body).$promise.then((data) => {
      this.pagination.list.push(data)
      this.alert.success('Chave de tradução "' + data.key + '" criada com sucesso!')
      $('#modalForm').modal('hide')
    }).catch((error) => {
      this.alert.error(error && error.data ? error.data.message : 'Ocorreu um erro inesperado!')
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
    this.resource(`${this.apiUrl}/chavetraducao/` + this.modalForm.model.id, null, { update: { method: 'PUT' } }).update(body).$promise.then((data) => {
      this.pagination.list.map((chave) => {
        if (chave.id === data.id) {
          chave.key = data.key
          chave.value = data.value
        }
        return chave
      })
      this.alert.success('Chave "' + this.modalForm.model.key + '" atualizada com sucesso!')
      this.chaveDetail = null
      $('#modalForm').modal('hide')
    }).catch((error) => {
      this.alert.error(error && error.data ? error.data.message : 'Ocorreu um erro inesperado!')
    })
  }

  deleteChave (chave) {
    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/chavetraducao/` + chave.id).delete().$promise.then((data) => {
      this.pagination.list.some((u, i) => {
        if (u.id === chave.id) {
          this.pagination.list.splice(i, 1)
          this.alert.success('Chave de tradução deletada com sucesso!')
          return true
        }
        return false
      })
    }).catch((error) => {
      this.alert.error(error?.message || error?.data?.message || 'Ocorreu um erro inesperado!')
    })
  }
}

angular.module('eticca.admin').controller('admin.translate-keys', [
  '$resource',
  'cloudSearchQuery',
  '$scope',
  'alertService',
  TranslateKeys
])
