import moment from 'moment'

class PublicEntities {
  constructor (scope, http, resource, user, authService, cloudSearchQuery, alert, timeout) {
    this.scope = scope
    this.http = http
    this.resource = resource
    this.user = user
    this.auth = authService
    this.cloudSearchQuery = cloudSearchQuery
    this.alert = alert
    this.timeout = timeout
    this.apiUrl = window.__API_URL
    this.appRef = 'COLLABORATOR'
    this.modalFormId = '#modalForm'
    this.formModel = {}
    this.order = {
      predicate: '',
      reverse: false
    }
    this.pagination = {
      search: '',
      limit: 15,
      totalPages: 0,
      page: 0,
      list: [],
      range: [],
      orderBy: {
        key: 'publicentity_meeting_date',
        order: 'desc'
      },
      order: {
        predicate: 'publicentity_meeting_date',
        reverse: false
      },
      next: this.nextPage.bind(this),
      prev: this.previousPage.bind(this),
      goTo: this.goToPage.bind(this)
    }
    this.modalReport = {
      local: ''
    }

    this.finishProcessing()

    this._onInit()
  }

  _onInit () {
    this.timeout(() => {
      $(['#datetimepicker1', '#datetimepicker2']).datetimepicker({
        locale: 'pt-br',
        format: 'DD/MM/YYYY',
        tooltips: window.datetimepickerTooltips
      })
      $('#datetimepicker1').on('dp.change', (e) => {
        this.formModel.contactDate = e.date ? e.date.format('DD/MM/YYYY') : null
        setTimeout(() => this.scope.$apply(), 100)
      })
      $('#datetimepicker2').on('dp.change', (e) => {
        this.formModel.meetingDate = e.date ? e.date.format('DD/MM/YYYY') : null
        setTimeout(() => this.scope.$apply(), 100)
      })
      ; ['#contactDate', '#meetingDate'].forEach((el) => $(el).inputmask('99/99/9999'))
      $('#modalForm').on('hidden.bs.modal', () => {
        setTimeout(() => this.scope.$apply(), 100)
      })
    }, 200)

    this.goToPage(0, true)
  }

  orderBy (predicate) {
    this.pagination.orderBy = {
      key: predicate,
      order: this.pagination.order.reverse ? 'desc' : 'asc'
    }
    this.goToPage(0, true, true)
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

  pesquisar () {
    this.pagination.page = 0

    return this.applyPagination()
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

  applyPagination () {
    const queryFields = []

    if (!this.auth.isAdmin() && !this.auth.isManager()) {
      queryFields.push(['created_user_id', this.auth.getUserInfo()?.id])
    }

    if (this.pagination.search) {
      // Define the search for all results that includes the `search`
      const search = this.pagination.search ? (this.pagination.search.indexOf('*') >= 0 ? '' : `*${this.pagination.search}*`) : ''

      queryFields.push(['(created_user_name', search.toUpperCase()])
      queryFields.push(['OR publicentity_name', search])
      queryFields.push(['OR publicentity_product', search])
      queryFields.push(['OR publicentity_contact', search])
      queryFields.push(['OR publicentity_meeting', `${search})`])
    }

    const params = {
      entity: 'publicentity',
      page: this.pagination.page,
      limit: this.pagination.limit,
      query: queryFields,
      sort: `${this.pagination.orderBy.key} ${this.pagination.orderBy.order}`
    }

    this.pagination.list = []
    this.pagination.page = 0
    this.pagination.range = [0]

    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then(this.successContacts.bind(this))
      .catch(this.catchContacts.bind(this))
  }

  successContacts (data) {
    this.pagination.list = data.data
    this.pagination.totalPages = data.totalPages
    this.pagination.page = data.page
    this.pagination.range = Array.apply(null, Array(data.totalPages)).map((_, i) => i)
  }

  catchContacts (error) {
    this.alert.error(error && error.data ? error.data.message : 'Erro ao tentar obter os contatos!')
  }

  clearModalForm (form) {
    Object.keys(this.formModel).forEach((key) => {
      this.formModel[key] = null
    })

    this.formModelDisabeld = false
    this._contatoForm = form
    this.formModel.userId = this.user.id
    this.formErrors = { hasError: false }
    this.auxContatoDataFiles = []
    this.contatoDataFiles = []
  }

  newContato (form) {
    this.clearModalForm(form)
  }

  startProcessing () {
    this.processing = true
  }

  finishProcessing () {
    this.processing = false
  }

  save (form) {
    if (form.$invalid) {
      this.formErrors = { hasError: true }
      this.finishProcessing()

      return
    }

    // Ignoring double-click
    if (this.processing) return

    this.startProcessing()

    this._contatoForm = form
    this.formErrors = { hasError: false }
    const contato = angular.copy(this.formModel)

    contato.contactDate = moment(contato.contactDate, 'DD/MM/YYYY').format()
    contato.meetingDate = moment(contato.meetingDate, 'DD/MM/YYYY').format()

    if (!contato.contactDate || !moment(contato.contactDate).isValid()) {
      this.alert.error('A data do contato não é válida')
      this.finishProcessing()
      return
    }

    if (!contato.meetingDate || !moment(contato.meetingDate).isValid()) {
      this.alert.error('A data da reunião não é válida')
      this.finishProcessing()
      return
    }

    if (moment(contato.contactDate).isAfter(moment())) {
      this.alert.error('A data do contato não pode ser após o dia de hoje')
      this.finishProcessing()
      return
    }

    if (moment(contato.meetingDate).isAfter(moment())) {
      this.alert.error('A data da reunião não pode ser após o dia de hoje')
      this.finishProcessing()
      return
    }

    const body = {
      publicEntity: contato.publicEntity,
      product: contato.product,
      contact: contato.contact,
      contactDate: contato.contactDate,
      meeting: contato.meeting,
      meetingDate: contato.meetingDate,
      observations: contato.observations,
      anexos: Object.keys(this.contatoDataFiles).map(key => ({
        filename: this.contatoDataFiles[key].name,
        size: this.contatoDataFiles[key].size,
        mimetype: this.contatoDataFiles[key].type
      }))
    }

    return (!contato.id ? this.createNew(body) : this.saveEdit(contato.id, body))
      .then(async (data) => {
        if (data) {
          await this.uploadFiles(data?.data?.files || [])

          this.alert.success(data.message)
          $(this.modalFormId).modal('hide')

          this.finishProcessing()
        }
      })
      .catch(error => {
        this.finishProcessing()
        this.onSaveError(error)
      })
  }

  createNew (contato) {
    /* istanbul ignore next */
    return this.http.post(`${this.apiUrl}/entidadepublica`, contato)
      .then((data) => {
        this.pagination.list.unshift({
          ...data.data,
          userName: typeof this.user.nome === 'string' ? this.user.nome : ''
        })

        return {
          data: data.data,
          message: 'Contato criado com sucesso!'
        }
      })
  }

  saveEdit (id, contato) {
    /* istanbul ignore next */
    return this.http.put(`${this.apiUrl}/entidadepublica/${id}`, contato)
      .then((data) => {
        this.pagination.list.some((c, i) => {
          if (c.id === data.data.id) {
            this.pagination.list[i] = {
              ...angular.copy(data.data),
              userName: typeof this.user.nome === 'string' ? this.user.nome : ''
            }

            return true
          }
          return false
        })

        return {
          data: data.data,
          message: 'Contato atualizado com sucesso!'
        }
      })
  }

  async uploadFiles (signedUrls) {
    try {
      if (!signedUrls || !Array.isArray(signedUrls)) return

      if (!(Array.isArray(signedUrls) && signedUrls.length)) {
        return this.handleError({ data: { message: 'Não foi possível gerar a(s) url(s) para o(s) envio(s) do(s) arquivo(s)' } })
      }

      for (const [i, obj] of signedUrls.entries()) {
        const oldFile = this.contatoDataFiles[i]
        const blob = oldFile.slice(0, oldFile.size, obj.contentType)
        const file = new File([blob], obj.filename, { type: obj.contentType })

        await fetch(obj.url, {
          method: 'PUT',
          body: file
        })
      }
    } catch (error) {
      console.error({ error })
      return this.handleError(error)
    }
  }

  onSaveError (error) {
    this.alert.error(error && error.data && error.data.message && (error.data.message.length < 450) ? error.data.message : 'Ocorreu um erro ao tentar salvar o contato atual! Tente novamente mais tarde.')
  }

  handleError (error) {
    this.alert.error(error?.data?.message || 'Ocorreu um erro inesperado! Tente novamente mais tarde.')
  }

  deleteContato (contato) {
    return this.resource(`${this.apiUrl}/entidadepublica/` + contato.id, null, { delete: { method: 'DELETE' } }).delete().$promise.then(
      () => {
        this.pagination.list.some((c, i) => {
          if (c.id === contato.id) {
            this.pagination.list.splice(i, 1)
            this.alert.success('Contato apagado com sucesso!')
            return true
          }
          return false
        })
      },
      this.onDeleteError.bind(this)
    )
  }

  onDeleteError (error) {
    this.alert.error(error && error.data && error.data.message && (error.data.message.length < 450) ? error.data.message : 'Ocorreu um erro ao tentar apagar o contato atual! Tente novamente mais tarde.')
  }

  async viewContato (event, contato) {
    try {
      const idDelBtn = 'del_' + contato.id
      this.clearModalForm(contato)

      if (event.target.getAttribute('id') === idDelBtn || event.target.parentElement.getAttribute('id') === idDelBtn) {
        return
      }

      const res = await this.http.get(`${this.apiUrl}/entidadepublica/${contato.id}`)

      this.timeout(() => {
        this.formModel = angular.copy(res.data)
        this.formModel.contactDate = moment(this.formModel.contactDate, 'YYYY-MM-DD').format('DD/MM/YYYY')
        this.formModel.meetingDate = moment(this.formModel.meetingDate, 'YYYY-MM-DD').format('DD/MM/YYYY')
        this.formModelDisabeld = this.isBefore24HoursFromNow(contato.insertedAt)
        this.contatoDataFiles = []
        this.auxContatoDataFiles = []
        $(this.modalFormId).modal('show')
      }, 250)
    } catch (error) {
      this.handleError(error)
    }
  }

  async downloadAnexo (id, item, index) {
    try {
      if (!id || !item) return

      const urlDownloadFile = `${this.apiUrl}/entidadepublica/download/${id}/${item?.id || ''}`

      const res = await this.http.get(urlDownloadFile)

      return this.http.get(res.data.url, { headers: { 'Content-Type': res.data.contentType }, responseType: 'arraybuffer' })
        .then(result => {
          this.openFile(result.data, res.data.filename, res.data.contentType)
        })
    } catch (error) {
      this.alert.error(error?.message ? error?.message : error?.data && error.data.message ? error.data.message : 'Não foi possível acessar o arquivo')
    }
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

  async getReport () {
    try {
      const res = await this.http.get(`${this.apiUrl}/report/publicentities/` + this.user.id + '?local=' + this.modalReport.local + '&date=' + moment().format('YYYY-MM-DD'), {
        responseType: 'arraybuffer'
      })
      const file = new Blob([res.data], { type: 'application/pdf' })
      const fileURL = window.URL.createObjectURL(file)
      window.open(fileURL, '_blank')
      $('#modalReport').modal('hide')
    } catch (error) {
      this.onReportError(error)
    }
  }

  onReportError (error) {
    const defaultMessage = 'Ocorreu um erro ao tentar gerar o relatório! Tente novamente mais tarde.'
    try {
      const reader = new FileReader()
      // This fires after the blob has been read/loaded.
      reader.addEventListener('loadend', (e) => {
        const error = JSON.parse(e.srcElement.result)
        this.alert.error(error.message || defaultMessage)
      })
      reader.readAsText(error.data)
    } catch (e) {
      this.alert.error(error && error.data && error.data.message && (error.data.message.length < 450) ? error.data.message : defaultMessage)
    }
  }

  isBefore24HoursFromNow (date) {
    date = new Date(date)
    const dateAfter = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, date.getHours(), date.getMinutes(), date.getSeconds())
    return new Date() > dateAfter
  }

  removeFile (index) {
    this.contatoDataFiles = this.contatoDataFiles || []
    this.contatoDataFiles.splice(index, 1)
    this.changeFileInput()
  }

  changeFileInput () {
    this.timeout(() => {
      this.scope.$apply(() => {
        this.contatoDataFiles = this.contatoDataFiles || []
        this.formModel.contatoAnexoError = this.contatoDataFiles.some((f) => { return f.sizeError }) ? 'O tamanho máximo de cada anexo é de 2mb.' : ''

        for (let i = 0; i < this.auxContatoDataFiles.length; i += 1) {
          if (!this.contatoDataFiles.some((f) => {
            return f.name === this.auxContatoDataFiles[i].name && f.lastModified === this.auxContatoDataFiles[i].lastModified && f.size === this.auxContatoDataFiles[i].size
          })) {
            const file = this.auxContatoDataFiles[i]
            const fileSizeMb = Math.floor(file.size / 1024 / 1024)
            if (fileSizeMb >= 2) {
              this.formModel.contatoAnexoError = 'O tamanho máximo de cada anexo é de 2mb.'
              file.sizeError = true
            }
            this.contatoDataFiles.push(file)
          }
        }
        if (!this.formModel.contatoAnexoError) {
          this.formModel.contatoAnexoError = this.contatoDataFiles.length > 5 ? 'O limite de 5 anexos foi atingido.' : ''
        }
      })
    }, 250)
  }
}

angular.module('eticca.collaborator').controller('publicEntities', [
  '$scope',
  '$http',
  '$resource',
  'userService',
  'authService',
  'cloudSearchQuery',
  'alertService',
  '$timeout',
  PublicEntities
])
