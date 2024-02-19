class Faq {
  constructor (resource, cloudSearchQuery, alert) {
    this.resource = resource
    this.alert = alert
    this.cloudSearchQuery = cloudSearchQuery
    this.apiUrl = window.__API_URL
    this.appRef = 'ADMIN'
    this.faqResource = this.resource(`${this.apiUrl}/faq/:id`, { id: '@id' }, {
      query: {
        method: 'GET',
        isArray: true
      },
      create: { method: 'POST' },
      update: { method: 'PUT' },
      delete: { method: 'DELETE' }
    })
    this.formNewFaq = {
      error: '',
      model: {
        item: '',
        subItems: ['']
      },
      clear: this.clearFormNewFaq.bind(this),
      create: this.createFaq.bind(this)
    }
    this.pagination = {
      search: '',
      limit: 50,
      totalPages: 0,
      page: 0,
      list: [],
      range: [],
      orderBy: {
        key: 'created_at',
        order: 'asc'
      },
      order: {
        predicate: 'created_at',
        reverse: false
      }
    }
    this._onInit()
  }

  _onInit () {
    this.applyPagination()
  }

  applyPagination () {
    const params = {
      entity: 'faq',
      page: this.pagination.page,
      limit: this.pagination.limit
      // sort: `${this.pagination.orderBy.key} ${this.pagination.orderBy.order}`
    }

    this.pagination.list = []

    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then(this.successFaq.bind(this))
      .catch(this.errorFaq.bind(this))
  }

  successFaq (data) {
    this.pagination.list = data.data.map(faq => ({ ...faq, subItemsJoined: faq.subItems.join('\n') }))
    this.pagination.totalPages = data.totalPages
    this.pagination.page = data.page
    this.pagination.range = Array.apply(null, Array(data.totalPages)).map((_, i) => {
      return i
    })
  }

  errorFaq (error) {
    this.alert.error('Erro', error?.message ? error.message : 'Ocorreu um erro inesperado ao tentar obter a lista de perguntas e respostas frequestes (FAQ)!')
  }

  cancelEdit (faq) {
    this.pagination.list.some((el, i) => {
      if (el.id === faq.id) {
        this.pagination.list[i] = angular.copy(faq._bkp)
        return faq._bkp
      }
      return false
    })
  }

  clearFormNewFaq () {
    this.formNewFaq.model = {
      item: '',
      subItems: ['']
    }
  }

  createFaq (body) {
    const params = {
      item: body.item,
      subItems: body.subItemsJoined.split('\n')
    }
    /* istanbul ignore next */
    this.faqResource.create(params).$promise
      .then((data) => {
        this.pagination.list.push(data)
        this.formNewFaq.clear()
        $('#modalNewFaq').modal('hide')
        this.alert.success('FAQ "' + data.item + '" criado com sucesso!')
      })
      .catch((error) => {
        this.alert.error(error?.data ? error.data.message : 'Ocorreu um erro inesperado!')
      })
  }

  edit (faq) {
    faq._bkp = angular.copy(faq)
    faq.editing = true
  }

  updateFaq (faq) {
    const params = {
      id: faq.id,
      item: faq.item,
      subItems: faq.subItemsJoined.split('\n')
    }
    /* istanbul ignore next */
    this.faqResource.update(params).$promise
      .then(() => {
        faq.editing = false
        this.pagination.list.map((item) => {
          if (item.id === faq.id) {
            item.item = params.item
            item.subItems = params.subItems
          }
          return item
        })
        this.alert.success('FAQ atualizado com sucesso!')
      })
      .catch((error) => {
        faq.editing = true
        this.alert.error(error?.data ? error.data.message : 'Ocorreu um erro inesperado!')
      })
  }

  deleteFaq (faq) {
    /* istanbul ignore next */
    this.faqResource.delete({ id: faq.id }).$promise
      .then(() => {
        this.pagination.list.some((el, i) => {
          if (el.id === faq.id) {
            this.pagination.list.splice(i, 1)
            return true
          }
          return false
        })
        this.alert.success('FAQ removido com sucesso!')
      })
      .catch((error) => {
        this.alert.error(error?.message || error?.data?.message || 'Ocorreu um erro inesperado!')
      })
  }
}

angular.module('eticca.admin').controller('admin.faq', [
  '$resource',
  'cloudSearchQuery',
  'alertService',
  Faq
])
