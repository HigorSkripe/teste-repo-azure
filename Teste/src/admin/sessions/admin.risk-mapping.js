class RiskMapping {
  constructor (resource, cloudSearchQuery, alert) {
    this.resource = resource
    this.cloudSearchQuery = cloudSearchQuery
    this.alert = alert
    this.apiUrl = window.__API_URL
    this.appRef = 'ADMIN'
    this.novo = {}
    this.exclude = null
    this.probabilidade = {
      desprezivel: 0.1,
      baixo: 0.3,
      moderado: 0.5,
      alto: 0.7,
      muito_alto: 0.9
    }
    this.impacto = {
      desprezivel: 0.05,
      baixo: 0.1,
      moderado: 0.2,
      alto: 0.4,
      muito_alto: 0.8
    }
    this.recomendacoes = {
      aceitar: 'Contrato em conformidade',
      mitigar: 'Encontrar formas de minimizar os riscos',
      eliminar: 'Deixar de contratar/renovar ou rescindir contrato',
      transferir: 'Aditar/renovar o contrato com cláusulas de compliance/anticorrupção',
      explorar: 'Realizar auditoria em fornecedor e emitir parecer'
    }
    this.grafico1 = {
      ameacas: {},
      oportunidades: {},
      ameacasX: [
        -0.05,
        -0.1,
        -0.2,
        -0.4,
        -0.8
      ],
      oportunidadesX: [
        0.05,
        0.1,
        0.2,
        0.4,
        0.8
      ],
      y: [
        0.9,
        0.7,
        0.5,
        0.3,
        0.1
      ]
    }
    this.grafico2 = {
      ameacas: {
        alto: 0,
        moderado: 0,
        baixo: 0
      },
      oportunidades: {
        alto: 0,
        moderado: 0,
        baixo: 0
      }
    }
    this.pagination = {
      search: '',
      page: 0,
      limit: 10,
      totalPages: 0,
      list: [],
      range: [],
      orderBy: {
        key: 'created_at',
        order: 'asc'
      },
      next: this.nextPage.bind(this),
      prev: this.previousPage.bind(this),
      goTo: this.goToPage.bind(this)
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
      queryFields.push(['(risk_description', `"${search}" OR `], ['risk_recommendation', `"${search}")`])
    }

    const params = {
      entity: 'risk',
      page: this.pagination.page,
      limit: this.pagination.limit,
      query: queryFields,
      sort: `${this.pagination.orderBy.key} ${this.pagination.orderBy.order}`
    }

    this.pagination.list = []

    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then(this.successRisk.bind(this))
      .catch(this.errorRisk.bind(this))
  }

  successRisk (data) {
    this.pagination.list = data.data
    this.pagination.totalPages = data.totalPages
    this.pagination.page = data.page
    this.pagination.range = Array.apply(null, Array(data.totalPages)).map((_, i) => {
      return i
    })
    this.updateAmeacaOportunidade()
  }

  errorRisk (error) {
    this.alert.error(error?.data?.message || 'Erro ao tentar obter os Mapeamentos de Riscos')
  }

  /**
   * Atualização de um item da tabela de probabilidades
   * @param {*} prob - item da tabela
   * @param {jQuery} el - (Opicional) Elemento para dar focus
   * @param {boolean} val - (Opicional) Se é para dar foco ou sair do foco
   */
  focus (prob, el, val) {
    if (!prob) {
      return
    }
    if (el) {
      prob['isFocus_' + el] = val
    }
    if (val) {
      setTimeout(() => {
        $('#' + el + '_' + prob.id).focus()
      }, 200)
    } else {
      const riskStrategiesUpdated = this.updateEstrategias(prob)
      this.resource(`${this.apiUrl}/risco/` + riskStrategiesUpdated.id, null, { update: { method: 'PUT' } })
        .update(riskStrategiesUpdated).$promise
        .then(data => {
          this.pagination.list.map(item => item.id === data.id ? data : item)
          this.updateAmeacaOportunidade()
        })
        .catch(error => {
          this.alert.error(error?.data?.message || 'Erro ao atualizar o Mapeamento')
        })
    }
  }

  /**
   * Atualização de um item da tabela de probabilidades
   */
  update (prob, from) {
    this.focus(prob, from, false)
  }

  /**
   * Criação de um item para tabela de probabilidades
   */
  create () {
    if (!this.novo.descricao || !this.novo.tipo || !this.novo.probabilidade || !this.novo.impacto || !this.novo.acao) {
      return
    }

    const riskStrategiesUpdated = this.updateEstrategias(this.novo)
    this.resource(`${this.apiUrl}/risco/`).save(riskStrategiesUpdated).$promise
      .then((data) => {
        this.novo = {}
        this.pagination.list.push(data)
      })
      .catch(error => {
        this.alert.error(error?.data?.message || 'Erro ao inserir o Mapeamento')
      })
  }

  updateEstrategias (prob) {
    return {
      ...prob,
      recomendacao: this.recomendacoes[prob.acao]
    }
  }

  /**
   * Inicia o processo de remoção do conteúdo
   * é preciso confirmação para remover
   * @param {*} prob - Objeto a ser excluído da tabela
   */
  remove (prob) {
    this.exclude = prob
  }

  /**
   * Confirmação da exclusão
   * @param {boolean} resp - Se confirma a exclusão ou não
   */
  confirmRemove (resp) {
    if (resp) {
      this.resource(`${this.apiUrl}/risco/` + this.exclude.id).delete().$promise
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
    } else {
      this.exclude = null
    }
  }

  // Funções para cálculo de probabilidade x impacto
  /**
   * Modifica o sinal do resultado da multiplicação
   * dependendo do tipo
   * @param {*} obj - Objeto da lista cadastrada de probabilidades
   * @return {number} - Número inteiro 1 ou -1
   */
  multiplicador (obj) {
    return obj.tipo === 'oportunidade' ? 1 : -1
  }

  /**
   * Multiplica a probabilidade pelo impacto e normaliza o sinal
   * @param {*} obj - Objeto da lista cadastrada de probabilidades
   * @return {number} - Resultado
   */
  probabilidadeImpacto (obj) {
    return this.multiplicador(obj) * (this.probabilidade[obj.probabilidade] * this.impacto[obj.impacto])
  }

  /**
   * Atualiza a tabela de ameaças e oportunidades
   */
  updateAmeacaOportunidade () {
    const keys = []
    const ameacasX = [
      -0.05,
      -0.1,
      -0.2,
      -0.4,
      -0.8
    ]
    const oportunidadesX = [
      0.05,
      0.1,
      0.2,
      0.4,
      0.8
    ]
    const y = [
      0.9,
      0.7,
      0.5,
      0.3,
      0.1
    ]
    ameacasX.forEach((numA) => {
      return y.forEach((numY) => {
        return keys.push(numA * numY)
      })
    })
    oportunidadesX.forEach((numA) => {
      return y.forEach((numY) => {
        return keys.push(numA * numY)
      })
    })
    this.grafico1 = {
      ameacas: {},
      oportunidades: {},
      ameacasX: ameacasX,
      oportunidadesX: oportunidadesX,
      y: y
    }
    const params = {
      entity: 'risk',
      page: 0,
      limit: 50
    }

    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then((list) => {
        list.data.forEach((el) => {
          const result = this.probabilidadeImpacto(el)
          this.pushGrafico1(result, keys)
        })
        this.countAmeacasOportunidades(keys)
      })
  }

  /**
   * Função para criar as keys no gráfico e somar se já tiver a key
   * Uma aproximação será feita caso o número não esteja dentro das keys possíveis
   * @param {Number} el - Número a ser adicionado no gráfico
   * @param {Array<number>} keys - Array com as keys possíveis
   */
  pushGrafico1 (el, keys) {
    const key = this.closest(el, keys)
    if (el >= 0) {
      this.grafico1.oportunidades[key] = this.grafico1.oportunidades[key] ? this.grafico1.oportunidades[key] + 1 : 1
    } else {
      this.grafico1.ameacas[key] = this.grafico1.ameacas[key] ? this.grafico1.ameacas[key] + 1 : 1
    }
  }

  /**
   * Dado um número e um array de números retorna o valor mais aproximado que possui no array
   * @param {Number} num - Número que se baseia
   * @param {Array<Number>} arr - Array que se deseja obter o valor
   */
  closest (num, arr) {
    let curr = arr[0]
    let diff = Math.abs(num - curr)
    for (let val = 0; val < arr.length; val += 1) {
      const newdiff = Math.abs(num - arr[val])
      if (newdiff < diff) {
        diff = newdiff
        curr = arr[val]
      }
    }
    return curr
  }

  /**
   * Calcula a quantidade de ameacas e oportunidades totais por setores (alto, moderado e baixo)
   * @parmas {Array<Number>} keys - Array com as keys possíveis
   */
  countAmeacasOportunidades (keys) {
    this.grafico2 = {
      ameacas: {
        alto: 0,
        moderado: 0,
        baixo: 0
      },
      oportunidades: {
        alto: 0,
        moderado: 0,
        baixo: 0
      }
    }
    angular.copy(keys).sort().forEach((key) => {
      const absKey = Math.abs(key)
      // Oportunidades
      if (key > 0) {
        if (key >= 0.18) {
          this.grafico2.oportunidades.alto += this.grafico1.oportunidades[key] ? this.grafico1.oportunidades[key] : 0
        } else if (key <= 0.05) {
          this.grafico2.oportunidades.baixo += this.grafico1.oportunidades[key] ? this.grafico1.oportunidades[key] : 0
        } else {
          this.grafico2.oportunidades.moderado += this.grafico1.oportunidades[key] ? this.grafico1.oportunidades[key] : 0
        }
      } else {
        // Ameaças
        if (absKey >= 0.18) {
          this.grafico2.ameacas.alto += this.grafico1.ameacas[key] ? this.grafico1.ameacas[key] : 0
        } else if (absKey <= 0.05) {
          this.grafico2.ameacas.baixo += this.grafico1.ameacas[key] ? this.grafico1.ameacas[key] : 0
        } else {
          this.grafico2.ameacas.moderado += this.grafico1.ameacas[key] ? this.grafico1.ameacas[key] : 0
        }
      }
    })
  }
}

angular.module('eticca.admin').controller('admin.risk-mapping', [
  '$resource',
  'cloudSearchQuery',
  'alertService',
  RiskMapping
])
