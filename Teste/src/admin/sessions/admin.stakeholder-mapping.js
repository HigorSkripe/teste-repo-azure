class StakeholderMapping {
  constructor (resource, cloudSearchQuery, alertService) {
    this.resource = resource
    this.cloudSearchQuery = cloudSearchQuery
    this.alertService = alertService
    this.apiUrl = window.__API_URL
    this.appRef = 'ADMIN'
    this.novo = {}
    this.exclude = null
    this.papel = {
      options: [
        {
          text: 'Cliente',
          value: 'cliente'
        },
        {
          text: 'Administração pública',
          value: 'administracao_publica'
        },
        {
          text: 'Fornecedor',
          value: 'fornecedor'
        },
        {
          text: 'Participação societária',
          value: 'participacao_societaria'
        },
        {
          text: 'Terceiro',
          value: 'terceiro'
        }
      ]
    }
    this.tabelaMapeamento = []
    this.counts = {
      monitorar: 0,
      monitorarConstantemente: 0,
      monitorarEventualmente: 0,
      monitorarRegularmente: 0,
      medioRisco: 0,
      altoRisco: 0,
      baixoRisco: 0,
      medioAltoRisco: 0,
      rodizioFuncao: 0,
      rodizioFornecedor: 0,
      acompanharRelacionamento: 0,
      auditarContratos: 0
    }
    this.grausRisco = {
      'alta;alto': 'MUITO ALTO',
      'alta;baixo': 'MÉDIO',
      'baixa;alto': 'ALTO',
      'baixa;baixo': 'BAIXO'
    }
    this.grupos = {
      'alta;alto': 'MONITORAR CONSTANTEMENTE',
      'alta;baixo': 'MONITORAR',
      'baixa;alto': 'MONITORAR REGULARMENTE',
      'baixa;baixo': 'MONITORAR EVENTUALMENTE'
    }
    this.tipos = {
      'alta;alto': 'ALTO RISCO',
      'alta;baixo': 'MÉDIO RISCO',
      'baixa;alto': 'MÉDIO-ALTO RISCO',
      'baixa;baixo': 'BAIXO RISCO'
    }
    this.acoes = {
      'alta;alto': 'RODÍZIO DE FORNECEDOR',
      'alta;baixo': 'AUDITAR CONTRATOS',
      'baixa;alto': 'RODÍZIO DE FUNÇÃO',
      'baixa;baixo': 'ACOMPANHAR RELACIONAMENTO'
    }
    this.pagination = {
      search: '',
      page: 0,
      limit: 10,
      totalPages: 0,
      range: [],
      orderBy: {
        key: 'created_at',
        order: 'asc'
      },
      list: [],
      next: this.nextPage.bind(this),
      prev: this.previousPage.bind(this)
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
      queryFields.push(['stakeholder_name', `"${search}"`])
    }

    const params = {
      entity: 'stakeholder',
      page: this.pagination.page,
      limit: this.pagination.limit,
      query: queryFields,
      sort: `${this.pagination.orderBy.key} ${this.pagination.orderBy.order}`
    }

    this.pagination.list = []

    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then(this.successStakeholder.bind(this))
      .catch(this.errorStakeholder.bind(this))
  }

  successStakeholder (data) {
    this.pagination.list = data.data
    this.pagination.totalPages = data.totalPages
    this.pagination.page = data.page
    this.pagination.range = Array.apply(null, Array(data.totalPages)).map((_, i) => {
      return i
    })
    this.updateEstrategias()
    this.count()
  }

  errorStakeholder (error) {
    this.alert.error(error?.data?.message || 'Erro ao tentar obter os Mapeamentos dos Stakeholders')
  }

  /**
   * Atualização de um item da tabela de probabilidades
   * @param {Object} stake - item da tabela
   * @param {jQuery} elem - (Opicional) Elemento para dar focus
   * @param {boolean} value - (Opicional) Se é para dar foco ou sair do foco
   */
  focus (stake, elem, value) {
    if (!stake) {
      return
    }
    if (elem) {
      stake['isFocus_' + elem] = value
    }
    if (value) {
      setTimeout(() => {
        $('#' + elem + '_' + stake.id).focus()
      }, 200)
    } else {
      const stakeStrategiesUpdated = this.updateEstrategias([stake])[0]
      this.resource(`${this.apiUrl}/stakeholder/` + stakeStrategiesUpdated.id, null, { update: { method: 'PUT' } })
        .update(stakeStrategiesUpdated).$promise
        .then(data => {
          this.pagination.list.map(item => item.id === data.id ? data : item)
        })
        .catch(error => {
          this.alert.error(error?.data?.message || 'Erro ao atualizar o Mapeamento')
        })
    }
  }

  update (value, from) {
    this.focus(value, from, false)
    this.count()
  }

  create () {
    if (!this.novo.nome || !this.novo.papel || !this.novo.influencia || !this.novo.interesse || !this.novo.definir || !this.novo.planejar || !this.novo.executar || !this.novo.revisar) {
      return
    }
    const stakeStrategiesUpdated = this.updateEstrategias([this.novo])[0]
    this.resource(`${this.apiUrl}/stakeholder`).save(stakeStrategiesUpdated).$promise
      .then((data) => {
        this.novo = {}
        this.pagination.list.push(data)
      })
      .catch(error => {
        this.alert.error(error?.data?.message || 'Erro ao inserir o Mapeamento')
      })
  }

  count () {
    this.counts = {
      monitorar: 0,
      monitorarConstantemente: 0,
      monitorarEventualmente: 0,
      monitorarRegularmente: 0,
      medioRisco: 0,
      altoRisco: 0,
      baixoRisco: 0,
      medioAltoRisco: 0,
      rodizioFuncao: 0,
      rodizioFornecedor: 0,
      acompanharRelacionamento: 0,
      auditarContratos: 0
    }
    const params = {
      entity: 'stakeholder',
      page: 0,
      limit: 50
    }

    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then((list) => {
        list = this.updateEstrategias(list.data)
        list.forEach((stakeholder) => {
          switch (stakeholder.grupo) {
            case this.grupos['alta;alto']:
              this.counts.monitorarConstantemente += 1
              break
            case this.grupos['alta;baixo']:
              this.counts.monitorar += 1
              break
            case this.grupos['baixa;alto']:
              this.counts.monitorarRegularmente += 1
              break
            case this.grupos['baixa;baixo']:
              this.counts.monitorarEventualmente += 1
              break
          }
          switch (stakeholder.tipo) {
            case this.tipos['alta;alto']:
              this.counts.altoRisco += 1
              break
            case this.tipos['alta;baixo']:
              this.counts.medioRisco += 1
              break
            case this.tipos['baixa;alto']:
              this.counts.medioAltoRisco += 1
              break
            case this.tipos['baixa;baixo']:
              this.counts.baixoRisco += 1
              break
          }
          switch (stakeholder.acao) {
            case this.acoes['alta;alto']:
              this.counts.rodizioFornecedor += 1
              break
            case this.acoes['alta;baixo']:
              this.counts.auditarContratos += 1
              break
            case this.acoes['baixa;alto']:
              this.counts.rodizioFuncao += 1
              break
            case this.acoes['baixa;baixo']:
              this.counts.acompanharRelacionamento += 1
              break
          }
        })
      })
  }

  updateEstrategias (list) {
    const iterator = (stakeholder) => {
      const key = stakeholder.influencia.toString() + ';' + stakeholder.interesse.toString()
      stakeholder.grauRisco = this.grausRisco[key]
      stakeholder.grupo = this.grupos[key]
      stakeholder.tipo = this.tipos[key]
      stakeholder.acao = this.acoes[key]
    }
    if (!list) {
      this.pagination.list.forEach(iterator)
      return this.pagination.list
    } else {
      list.forEach(iterator)
      return list
    }
  }

  remove (value) {
    this.exclude = value
  }

  confirmRemove (resp) {
    if (resp) {
      this.resource(`${this.apiUrl}/stakeholder/${this.exclude.id}`).delete().$promise
        .then(() => {
          this.exclude = null
          this.pagination.list.some((item, i) => {
            if (item.id === resp.id) {
              this.pagination.list.splice(i, 1)
              this.alert.success('Mapeamento removido com sucesso!')
              return true
            }
            return false
          })
        })
        .catch(error => {
          this.alert.error(error?.data?.message || 'Erro ao remover o Mapeamento')
        })
    }
    this.exclude = null
  }
}

angular.module('eticca.admin').controller('admin.stakeholder-mapping', [
  '$resource',
  'cloudSearchQuery',
  'alertService',
  StakeholderMapping
])
