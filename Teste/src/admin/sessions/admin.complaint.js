import moment from 'moment'
import { equals, last } from 'ramda'

class Complaint {
  constructor (scope, resource, cloudSearchQuery, timeout, routeParams, alert, http, userService) {
    this.scope = scope
    this.resource = resource
    this.cloudSearchQuery = cloudSearchQuery
    this.timeout = timeout
    this.routeParams = routeParams
    this.alert = alert
    this.http = http
    this.userService = userService
    this.apiUrl = window.__API_URL
    this.appRef = 'ADMIN'
    this.initialProtocol = routeParams.protocolo
    this.keyDenuncia = window.i18n('#denuncia')
    this.keyDenuncias = window.i18n('#denuncias')
    this.keyMalfeitor = window.i18n('#malfeitor')

    this.limits = [25, 50, 100]
    this.pagination = {
      status: 'aberto',
      search: '',
      searchComplaints: false,
      limit: this.limits[0],
      aberto: this.clearPagination(),
      em_progresso: this.clearPagination(),
      fechado: this.clearPagination(),
      orderBy: {
        key: 'created_at',
        order: 'desc'
      },
      order: {
        predicate: 'created_at',
        reverse: true
      },
      next: this.nextPage.bind(this),
      prev: this.previousPage.bind(this),
      goTo: this.goToPage.bind(this)
    }
    this.modalDenuncias = {
      error: '',
      save: this.saveDenuncia.bind(this),
      model: {
        id: '',
        insertedAt: '',
        status: '',
        texto: '',
        responsavel: '',
        visivel: 'Sim',
        threads: []
      },
      open: this.openModalDenuncias.bind(this)
    }
    this.modalDenunciaThreadStyle = (isTramitacao, visivel) => !isTramitacao && visivel === false ? { 'background-color': '#fffae6' } : {}
    this.formModelReport = {
      error: {
        startDateAfterToday: false,
        endDateMinor: false,
        reportRangeDateBigger: false,
        reportStartDate: false,
        reportEndDate: false
      },
      startDate: '',
      endDate: '',
      reportRangeDate: 6,
      generateReport: this.generateReport.bind(this),
      open: this.openModalReport.bind(this)
    }

    /** Variáveis para o dropdown de filiais */
    this.filiais = []
    this.filiaisDefault = [
      {
        id: '',
        nome: 'Todas as filiais',
        todas: true
      },
      {
        id: '',
        nome: 'Sem filial',
        todas: false
      }
    ]
    this.filialSelected = this.filiaisDefault[0]

    /** Define o limite do texto a ser exibido na listagem. */
    this.showDenunciaProblemLimit = 180

    /** Hide the unnecessary fields */
    this.doubtSuggestionComplimentSearch = false

    /** List to add files to respond the threads */
    this.threadFiles = []

    this._onInit()
  }

  async _onInit () {
    try {
      this.user = await this.userService.$promise
    } catch (error) {
      console.log('Erro ao buscar os dados do usuário logado')
      console.error(error)
    }

    /* Buscando as filiais apenas registradas nas denúncias */
    const params = {
      entity: 'complaint',
      type: 'facet',
      facets: [['complaint_branch_name', 'filiais']]
    }
    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then((data) => {
        /* Preenchendo a lista de filiais com o resultado da busca mantendo as filiais padrões no início */
        this.filiais = [...this.filiaisDefault, ...data.facets.filiais]
      })
      .catch(error => {
        console.log(error)
        this.alert.error('Erro ao buscar as filiais')
      })

    this.resource(`${this.apiUrl}/denuncia/rangedate/textlimit`).get().$promise
      .then((data) => {
        this.formModelReport.reportRangeDate = data.complaintReportRangeDate || this.formModelReport.reportRangeDate
        // this.showDenunciaProblemLimit = data.complaintTextLimit || this.showDenunciaProblemLimit
      })

    this.loadComplaintsForAllStatus()

    angular.element(document).ready(() => {
      $('#modalDenuncias').on('hidden.bs.modal', () => {
        this.clearModalDenuncias()
      })
    })

    this.timeout(() => {
      $(['#datetimepicker1', '#datetimepicker2']).datetimepicker({
        locale: 'pt-br',
        format: 'DD/MM/YYYY',
        tooltips: window.datetimepickerTooltips
      })
      $('#datetimepicker1').on('dp.change', (e) => {
        this.formModelReport.startDate = e.date ? e.date.format('DD/MM/YYYY') : null
        this.clearStartDateError()
        setTimeout(() => this.scope.$apply(), 100)
      })
      $('#datetimepicker2').on('dp.change', (e) => {
        this.formModelReport.endDate = e.date ? e.date.format('DD/MM/YYYY') : null
        this.clearEndDateError()
        setTimeout(() => this.scope.$apply(), 100)
      })
      ; ['#reportStartDate', '#reportEndDate'].forEach((el) => $(el).inputmask('99/99/9999'))
      $('#modalReport').on('hidden.bs.modal', () => {
        this.clearModalForm()
        setTimeout(() => this.scope.$apply(), 100)
      })
    }, 200)
  }

  clearModalDenuncias () {
    this.modalDenuncias.model = {
      id: '',
      insertedAt: '',
      status: '',
      problema: '',
      malfeitor: '',
      testemunha: '',
      evidencia: '',
      informacaoRelevante: '',
      telefone: '',
      nome: '',
      fatoRelatado: '',
      responsavel: ''
    }
  }

  updateFilialSelected () {
    /* Limpando o campo de pesquisa */
    this.pagination.search = ''

    return this.loadComplaintsForAllStatus()
  }

  searchByStatus (status) {
    this.pagination.status = status
  }

  clearPagination () {
    return {
      count: 0,
      page: 0,
      totalPages: 0,
      list: [],
      range: []
    }
  }

  loadComplaintsForAllStatus (search) {
    /** Limpando as variáveis de paginação para cada status */
    this.pagination.aberto = this.clearPagination()
    this.pagination.em_progresso = this.clearPagination()
    this.pagination.fechado = this.clearPagination()

    this.applyPagination({ status: 'aberto', protocolo: search ? search.protocolo : this.initialProtocol, ...this.loadDefaultFilter() })
    this.applyPagination({ status: 'em_progresso', protocolo: search ? search.protocolo : this.initialProtocol, ...this.loadDefaultFilter() })
    this.applyPagination({ status: 'fechado', protocolo: search ? search.protocolo : this.initialProtocol, ...this.loadDefaultFilter() })
  }

  pesquisar (searchText) {
    this.filialSelected = this.filiaisDefault[0]

    const reportSearch = {
      protocolo: searchText ? (searchText.indexOf('*') >= 0 ? '' : `*${searchText}*`) : ''
    }

    return this.loadComplaintsForAllStatus(reportSearch)
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

  loadDefaultFilter (withStatus) {
    const result = {}

    if (withStatus) {
      result.status = this.pagination.status
    }
    if (this.filialSelected && this.filialSelected.nome) {
      result.filialNome = this.filialSelected.nome
    }

    return result
  }

  goToPage (page, first, ordering, search) {
    if (this.pagination[this.pagination.status].page === page && !first && !ordering) {
      return
    }

    const reportSearch = {}

    if (search && search.protocolo) {
      reportSearch.protocolo = search.protocolo
    }

    this.pagination[this.pagination.status].page = page

    return this.applyPagination({ ...reportSearch, ...this.loadDefaultFilter(true) })
  }

  previousPage () {
    if (this.pagination[this.pagination.status].page === 0) {
      return
    }

    this.pagination[this.pagination.status].page -= 1

    return this.applyPagination({ ...this.loadDefaultFilter(true) })
  }

  nextPage () {
    if (this.pagination[this.pagination.status].page === this.pagination[this.pagination.status].totalPages - 1) {
      return
    }

    this.pagination[this.pagination.status].page += 1

    return this.applyPagination({ ...this.loadDefaultFilter(true) })
  }

  applyPagination (search) {
    const status = search ? search.status : 'aberto'
    const queryFields = [['complaint_status', status]]

    if (search) {
      if (search.filialNome && !this.filiaisDefault.map(a => a.nome).some(a => a === search.filialNome)) {
        queryFields.push(['complaint_branch_name', `"${search.filialNome}"`])
      } else if (!this.filialSelected.todas) {
        queryFields.push(['NOT complaint_branch_name', '*'])
      }
      if (search.protocolo) {
        queryFields.push(['(complaint_protocol', `${search.protocolo}`])
        queryFields.push(['OR complaint_problem', `${search.protocolo})`])
      }
    }

    const params = {
      entity: 'complaint',
      page: this.pagination[status].page,
      limit: this.pagination.limit,
      query: queryFields,
      sort: `${this.pagination.orderBy.key} ${this.pagination.orderBy.order}`
    }

    this.pagination.searchComplaints = true
    this.pagination[status].count = 0
    this.pagination[status].list = []

    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then(result => this.successDenuncias(result, status))
      .then(() => {
        /** Caso a tela de denúncia seja aberta via redirecionamento pelo alerta de novo protocolo no email */
        if (search && search.protocolo) {
          this.filialSelected = this.filiaisDefault[0]
        }
      })
      .catch(this.catchDenuncias.bind(this))
  }

  successDenuncias (data, status) {
    this.pagination[status].list = data.data
    this.pagination[status].count = data.count
    this.pagination[status].totalPages = data.totalPages
    this.pagination[status].page = data.page
    this.pagination[status].range = Array.apply(null, Array(data.totalPages)).map((_, i) => i)
    this.pagination.searchComplaints = false
  }

  catchDenuncias (error) {
    this.alert.error('Erro', error.data ? error.data.message : 'Erro ao tentar obter as denúncias!')
  }

  openModalDenuncias (denuncia) {
    const denModal = angular.copy(denuncia)
    this.auxModalDenuncias = null
    this.clearThreadFiles()

    this.resource(`${this.apiUrl}/denuncia/` + denModal.id).get().$promise
      .then((data) => {
        this.modalDenuncias.model = data
        this.modalDenuncias.model.resposta = ''
        this.modalDenuncias.model.responsavel = this.user?.nome || ''
        this.modalDenuncias.model.visivel = true
        this.modalDenuncias.model.tipoRelatoText = this.getTipoAtividade(this.modalDenuncias.model.tipoRelato)
        this.doubtSuggestionComplimentSearch = (this.modalDenuncias.model.tipoRelato || 0).toString() === '19'
        this.doubtSuggestionComplimentText = this.doubtSuggestionComplimentSearch ? 'Dúvidas, Sugestões ou Elogios' : `Informações do(a) ${this.keyDenuncia}`

        this.auxModalDenuncias = JSON.parse(JSON.stringify(data))

        this.modalDenuncias.threads = this.makeThreads(data.threads, data.tramitacao)
        $('#modalDenuncias').modal('show')
      }, () => {
        this.alert.error('Problema ao retornar dados da denúncia.')
      })
  }

  openModalReport (form) {
    this.clearModalForm(form)
    $('#modalReport').modal('show')
  }

  saveDenuncia () {
    const denuncia = this.modalDenuncias.model

    if (denuncia.status === 'fechado' && !denuncia.resultado) {
      this.alert.error('O resultado do protocolo deve ser preenchido!')

      return
    }

    const files = this.threadFiles
    const params = {
      status: denuncia.status,
      responsavel: denuncia.responsavel,
      resposta: denuncia.resposta,
      resultado: denuncia.resultado,
      visivel: denuncia.visivel,
      files: Object.keys(files).map(key => ({
        filename: files[key].name,
        size: files[key].size,
        mimetype: files[key].type
      }))
    }

    return this.resource(`${this.apiUrl}/denuncia/` + denuncia.id, null, { update: { method: 'PUT' } }).update(params).$promise
      .then(async (result) => {
        if (params.status === this.auxModalDenuncias.status) {
          /* Se o status da denúncia não foi alterado, apenas atualiza a na lista do status */
          this.pagination[params.status].list.some((complaint) => {
            if (complaint.id === result.id) {
              complaint.status = result.status
              complaint.updatedAt = result.updatedAt

              return true
            }

            return false
          })
        } else {
          /* Senão remove a denúncia da lista do status anterior e insere na lista do novo status */
          /* Removendo da lista */
          this.pagination[this.auxModalDenuncias.status].list.map((complaint, i) => {
            if (complaint.id === result.id) {
              this.pagination[this.auxModalDenuncias.status].list.splice(i, 1)
              return true
            }

            return false
          })
          this.pagination[this.auxModalDenuncias.status].count -= 1

          /* Adicionando em outra lista */
          this.pagination[params.status].list.unshift(result)
          this.pagination[params.status].count += 1
        }

        if (Array.isArray(result.threadFiles) && result.threadFiles.length) {
          for (const [i, obj] of result.threadFiles.entries()) {
            const oldFile = files[i]
            const blob = oldFile.slice(0, oldFile.size, obj.contentType)
            const file = new File([blob], obj.filename, { type: obj.contentType })

            try {
              await fetch(obj.url, {
                method: 'PUT',
                body: file
              })
            } catch (error) {
              throw new Error('Ocorreu um erro ao enviar o arquivo.')
            }
          }
        }

        $('#modalDenuncias').modal('hide')
        this.clearThreadFiles()
        this.alert.success(`Denúncia "${denuncia.protocolo}" atualizada com sucesso!`)

        /** Finishing thread file upload */
        try {
          const thread = last(result.threads)
          await this.resource(`${this.apiUrl}/denuncia/thread/finishupload/${denuncia.protocolo}`).save({ threadId: thread?.id }).$promise
        } catch (error) {
          console.warn(error)
        }
      })
      .catch((error) => {
        this.alert.error('Erro', error?.message ? error?.message : (error?.data ? error.data.message : 'Ocorreu um erro inesperado!'))
      })
  }

  changeComplaintThread (thread) {
    const params = {
      insertedAt: thread.insertedAt,
      userId: thread.userId,
      responsavel: thread.responsavel,
      texto: thread.texto,
      status: thread.status,
      visivel: !thread.visivel
    }

    return this.resource(`${this.apiUrl}/denuncia/${this.modalDenuncias.model.id}/thread`, null, { update: { method: 'PUT' } }).update(params).$promise
      .then((data) => {
        this.modalDenuncias.threads.map((thread) => {
          if (equals(thread.insertedAt, data.insertedAt) &&
              equals(thread.userId, data.userId) &&
              equals(thread.responsavel, data.responsavel) &&
              equals(thread.texto, data.texto) &&
              equals(thread.status, data.status)) {
            thread.updatedUserId = data.updatedUserId
            thread.updatedUser = data.updatedUser
            thread.updatedAt = data.updatedAt
            thread.visivel = data.visivel
          }

          return thread
        })

        this.alert.success('A visibilidade da mensagem foi alterada')
      }, () => {
        this.alert.error('Erro na tentantiva de mudar a visibilidade')
      })
  }

  makeThreads (threads, tramitacao) {
    threads = (threads || []).map(thread => {
      thread.visivel = typeof thread.visivel === 'undefined' ? true : thread.visivel
      return thread
    })
    tramitacao = (tramitacao || []).map((t) => {
      t.isTramitacao = true
      return t
    })

    return [].concat(threads).concat(tramitacao).sort((a, b) => {
      return a.insertedAt < b.insertedAt ? -1 : 1
    })
  }

  getTipoAtividade (n) {
    const msg = 'Tipo de relato não encontrado'

    if (!n) return msg

    switch (n.toString()) {
      case '0':
        return 'Assédio moral ou agressão física'
      case '1':
        return 'Assédio sexual'
      case '2':
        return 'Acidente não reportado'
      case '3':
        return 'Desvio de comportamento'
      case '4':
        return 'Discriminação'
      case '5':
        return 'Distorções em demonstrações financeiras'
      case '6':
        return 'Descumprimento de normas e políticas internas'
      case '7':
        return 'Favorecimento ou conflito de interesses'
      case '8':
        return 'Fraude'
      case '9':
        return 'Lavagem de dinheiro'
      case '10':
        return 'Relacionamento íntimo com subordinação direta'
      case '11':
        return 'Roubo, furto ou desvio de materiais'
      case '12':
        return 'Uso ou tráfico de substâncias proibidas'
      case '13':
        return 'Uso indevido de bens e recursos'
      case '14':
        return 'Vazamento ou uso indevido de informações'
      case '15':
        return 'Violação de leis ambientais'
      case '16':
        return 'Violação de leis trabalhistas'
      case '17':
        return 'Violação de leis não explícitas nas demais categorias'
      case '18':
        return 'Pagamento ou recebimento impróprios (corrupção)'
      case '19':
        return 'Dúvidas, Sugestões ou Elogios'
      case '20':
        return 'Outros'
      default:
        return msg
    }
  }

  async generateReport (type) {
    const startDate = moment(this.formModelReport.startDate, 'DD/MM/YYYY').startOf('day').toISOString()
    const endDate = moment(this.formModelReport.endDate, 'DD/MM/YYYY').endOf('day').toISOString()

    if (!moment(startDate).isValid()) {
      this.formModelReport.error.reportStartDate = true
      return
    } else if (moment(startDate).isAfter(moment())) {
      this.formModelReport.error.startDateAfterToday = true
      return
    } else {
      this.formModelReport.error.reportStartDate = false
      this.formModelReport.error.startDateAfterToday = false
    }

    if (!moment(endDate).isValid()) {
      this.formModelReport.error.reportEndDate = true
      return
    } else {
      this.formModelReport.error.endDateMinor = false
      this.formModelReport.error.reportEndDate = false
      this.formModelReport.error.reportRangeDateBigger = false
    }

    const diffMonths = moment(endDate).diff(startDate, 'months')

    if (moment(startDate).isAfter(endDate)) {
      this.formModelReport.error.endDateMinor = true
      return
    }

    if (diffMonths > this.formModelReport.reportRangeDate) {
      this.formModelReport.error.reportRangeDateBigger = true
      this.formModelReport.error.reportEndDate = true
      return
    }

    const url = (type === 'pdf') ? `${this.apiUrl}/report/complaints` : `${this.apiUrl}/report/complaints/csv`

    const filialId = this.pagination.aberto.list.length ? this.pagination.aberto.list[0].filialId : this.pagination.em_progresso.list.length ? this.pagination.em_progresso.list[0].filialId : this.pagination.fechado.list.length ? this.pagination.fechado.list[0].filialId : ''
    const isFilial = this.filialSelected && typeof this.filialSelected.todas === 'undefined' ? '&filialId=' + filialId : '&todas=' + this.filialSelected.todas

    const filter = '?startDate=' + startDate + '&endDate=' + endDate + isFilial
    this.http.get(url + filter, { responseType: 'arraybuffer' })
      .then(res => {
        this.openFile(res.data, `relatorio_denuncias_${moment(startDate).format('DD-MM-YYYY')}_${moment(endDate).format('DD-MM-YYYY')}.${type.toLowerCase()}`, (type === 'pdf') ? 'application/pdf' : 'text/csv')

        $('#modalReport').modal('hide')
        this.clearModalForm()
      })
      .catch((error) => {
        $('#modalReport').modal('hide')
        this.alert.error(error?.data && error.data.message ? error.data.message : 'Ocorreu um erro inesperado!')
        this.clearModalForm()
      })
  }

  clearModalForm (form) {
    this.formModelReport.startDate = ''
    this.formModelReport.endDate = ''
    this.formModelReport.error.startDateAfterToday = false
    this.formModelReport.error.reportRangeDateBigger = false
    this.formModelReport.error.reportStartDate = false
    this.formModelReport.error.reportEndDate = false
  }

  clearStartDateError () {
    this.formModelReport.error.reportStartDate = false
    this.formModelReport.error.startDateAfterToday = false
  }

  clearEndDateError () {
    this.formModelReport.error.reportRangeDateBigger = false
    this.formModelReport.error.reportEndDate = false
  }

  async downloadAnexo (type, item, index) {
    try {
      const fileUrl = this.getDownloadAnexoUrl(type, item.id, index)
      const res = await this.http.get(fileUrl)

      return this.http.get(res.data.url, { headers: { 'Content-Type': res.data.contentType }, responseType: 'arraybuffer' })
        .then(result => {
          this.openFile(result.data, res.data.filename, res.data.contentType)
        })
    } catch (error) {
      this.alert.error(error?.message ? error?.message : error?.data && error.data.message ? error.data.message : 'Não foi possível acessar o arquivo')
    }
  }

  getDownloadAnexoUrl (type, id, index) {
    const fileUrl = {
      complaint: `${this.apiUrl}/denuncia/download/${this.modalDenuncias.model.id}?index=${index}`,
      proceeding: `${this.apiUrl}/denuncia/tramitacao/${this.modalDenuncias.model.protocolo}/download/${id}?index=${index}`,
      thread: `${this.apiUrl}/denuncia/thread/${this.modalDenuncias.model.protocolo}/download/${id}`
    }

    return fileUrl[type]
  }

  async downloadAndamento () {
    const andamentoUrl = `${this.apiUrl}/report/complaints/${this.modalDenuncias.model.id}`
    const res = await this.http.get(andamentoUrl, { responseType: 'arraybuffer' })
    this.openFile(res.data, `relatorio_denuncia_${moment().format('DD_MM_YYYY')}_${this.modalDenuncias.model.protocolo}.pdf`, 'application/pdf')
  }

  openFile (data, filename, contentType) {
    const aLink = document.createElement('a')
    document.body.appendChild(aLink)

    const file = new Blob([data], { type: contentType || 'image/png' })
    const fileUrl = window.URL.createObjectURL(file)

    aLink.target = '_blank'
    aLink.href = fileUrl
    aLink.download = filename
    aLink.click()
    this.timeout(() => {
      document.body.removeChild(aLink)
    }, 200)
  }

  changeFileInput () {
    this.timeout(() => {
      this.scope.$apply(() => {
        for (let i = 0; i < this.threadFiles.length; i += 1) {
          this.threadFiles[i].sizeError = Math.floor(this.threadFiles[i].size / 1024 / 1024) >= 2
        }
      })
    }, 250)
  }

  removeFile () {
    this.clearThreadFiles()
    this.changeFileInput()
  }

  clearThreadFiles () {
    this.threadFiles = []
  }
}

angular.module('eticca.admin').controller('admin.complaint', [
  '$scope',
  '$resource',
  'cloudSearchQuery',
  '$timeout',
  '$routeParams',
  'alertService',
  '$http',
  'userService',
  Complaint
])
