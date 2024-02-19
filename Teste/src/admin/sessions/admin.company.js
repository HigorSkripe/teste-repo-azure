class Company {
  constructor (resource, user, cloudSearchQuery, http, alert) {
    this.resource = resource
    this.user = user
    this.cloudSearchQuery = cloudSearchQuery
    this.http = http
    this.alert = alert
    this.apiUrl = window.__API_URL
    this.appRef = 'ADMIN'
    this.logoFile = null
    this.optLogo = 'logo'
    this.progress = {
      visible: false,
      keep: false,
      complete: 0
    }
    this.empresa = {
      id: '',
      nome: '',
      cnpj: '',
      email: '',
      prazoDenuncia: '',
      periodo: ''
    }

    /* Reunindo as informações para gerenciar as filiais da empresa */
    this.branchReference = {
      branch: null,
      page: 0
    }
    this.filial = {
      filiais: [],
      filteredFiliais: [],
      search: '',
      order: {
        predicate: 'branch_name',
        reverse: false
      },
      modalForm: {
        title: '',
        doing: '',
        button: '',
        model: {
          id: '',
          name: '',
          empresaId: ''
        },
        validations: {},
        clearModalForm: this.filialClearModalForm.bind(this),
        open: this.filialOpenModalForm.bind(this),
        save: this.filialSaveModalForm.bind(this),
        delete: this.filialDelete.bind(this),
        getSections: this.filialGetSections.bind(this),
        getRoot: this.filialGetRoot.bind(this)
      },
      pagination: {
        limit: 10,
        totalPages: 0,
        page: 0,
        range: [],
        next: this.filialNextPage.bind(this),
        prev: this.filialPreviousPage.bind(this),
        goTo: this.filialGoToPage.bind(this)
      },
      orderBy: this.filialOrderBy.bind(this),
      pesquisar: this.filialPesquisar.bind(this),
      orderByObj: {}
    }
    this._onInit()
  }

  _onInit () {
    this.buscarEmpresa()
  }

  buscarEmpresa () {
    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/empresa`, {}, { query: { method: 'GET' } }).query({}).$promise
      .then((data) => {
        this.empresa = data

        /* Carregando a primeira página com as informações das filiais da empresa */
        this.filialGoToPage(0, true)
      })
      .catch((error) => {
        this.alert.error(error?.message ? error.message : 'Ocorreu um erro inesperado!')
      })
  }

  updateEmpresa () {
    if (!this.validarCampos()) {
      this.toTop()
      return
    }
    const empresa = {
      nome: this.empresa.nome,
      cnpj: this.empresa.cnpj,
      email: this.empresa.email,
      periodo: this.empresa.periodo,
      prazoDenuncia: this.empresa.prazoDenuncia
    }
    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/empresa/`, {}, { update: { method: 'PUT' } }).update(empresa).$promise
      .then((data) => {
        this.alert.success('Dados da Empresa atualizados com sucesso!')
        this.toTop()
      })
      .catch((error) => {
        this.alert.error(error?.message ? error.message : 'Ocorreu um erro inesperado!')
      })
  }

  sendEmail () {
    this.http.post(`${this.apiUrl}/report/users/email`, {
      transformRequest: angular.identity,
      headers: { 'Content-Type': undefined }
    })
      .then(() => {
        this.alert.success('Email enviado com sucesso!')
      }, (error) => {
        this.alert.error(error?.data ? error.data.message : 'Ocorreu um erro inesperado!')
      })
  }

  async sendLogo (fileModel) {
    if (!this.logoFile || $.isEmptyObject(this.logoFile)) {
      return
    }

    try {
      this.startProgress()

      const params = {
        filename: fileModel[0].name,
        mimetype: fileModel[0].type
      }
      const signedUrls = await this.http.put(`${this.apiUrl}/empresa/logo/${this.optLogo}`, params)
      if (!signedUrls.data || !signedUrls.data.url || !signedUrls.data.filename || !signedUrls.data.contentType) {
        return this.handleError({ data: { message: 'Não foi possível gerar a url para o envio da logo' } })
      }

      const blob = fileModel[0].slice(0, fileModel[0].size, signedUrls.data.contentType)
      const file = new File([blob], signedUrls.data.filename, { type: signedUrls.data.contentType })

      return fetch(signedUrls.data.url, {
        method: 'PUT',
        body: file
      })
        .then(() => {
          this.completeProgress()
          this.alert.success('Envio de arquivo concluído!')
        })
        .catch(error => {
          console.error(error)
          this.completeProgress()
          this.handleError({ data: { message: 'Ocorreu um erro no envio da logo!' } })
        })
    } catch (error) {
      console.log({ error })
      this.completeProgress()
      this.handleError({ data: { message: 'Ocorreu um erro no envio da logo!' } })
    }
  }

  startProgress () {
    this.progress.keep = this.progress.visible = true
    this.progress.complete = 0
    return this.keepProgress(5)
  }

  keepProgress (n) {
    let time = 200
    return setTimeout(() => {
      if (this.progress.keep) {
        if (this.progress.complete < 50) {
          this.progress.complete += n
        } else {
          if (this.progress.complete + 1 < 70) {
            time = 600
          } else {
            time = 1400
          }
          this.progress.complete = this.progress.complete + 1 < 95 ? this.progress.complete + 1 : this.progress.complete
        }
        $('#progressLogo').css({ width: this.progress.complete.toString() + '%' })
        return this.keepProgress(n)
      }
    }, time)
  }

  completeProgress () {
    this.progress.keep = false
    this.progress.complete = 100
    $('#progressLogo').css({ width: this.progress.complete.toString() + '%' })
  }

  validarCampos () {
    if (this.empresa.nome.length === 0 && this.empresa.cnpj.length === 0) {
      this.alert.error('Os campos não podem estar vazios.')
      return false
    }
    if (this.empresa.nome.length === 0) {
      this.alert.error('O nome da empresa não pode estar vazio.')
      return false
    }
    if (angular.isDefined(this.empresa.cnpj) && this.empresa.cnpj.length === 0) {
      this.alert.error('O CNPJ nõa pode estar vazio.')
      return false
    }
    if (!/([0-9]{2}[.]?[0-9]{3}[.]?[0-9]{3}[/]?[0-9]{4}[-]?[0-9]{2})/.test(this.empresa.cnpj)) {
      this.alert.error('CNPJ inválido')
      return false
    }
    if (this.empresa.email.length !== 0) {
      if (!/^([0-9a-zA-Z]([-_\\.]*[0-9a-zA-Z]+)*)@([0-9a-zA-Z]([-_\\.]*[0-9a-zA-Z]+)*)[\\.]([a-zA-Z]{2,9})$/.test(this.empresa.email)) {
        this.alert.error('Email inválido')
        return false
      }
    }
    if (this.empresa.prazoDenuncia <= 0) {
      this.alert.error('Prazo deve ser preenchido')
      return false
    }
    return true
  }

  toTop () {
    $('html, body').animate({ scrollTop: 0 }, 'fast')
  }

  handleError (error) {
    this.alert.error(error?.data?.message || 'Ocorreu um erro inesperado! Tente novamente mais tarde.')
  }

  /* ======================X Funcionalidades das Filiais X====================== */

  filialOrderBy (predicate) {
    this.filial.order.reverse = this.filial.order.predicate !== predicate ? false : !this.filial.order.reverse
    this.filial.order.predicate = predicate
    this.filialGoToPage(0, false, true)
  }

  filialGoToPage (page, first, ordering) {
    if (this.filial.pagination.page === page && !first && !ordering) {
      return
    }

    this.filial.pagination.page = page

    return this.filialApplyPagination()
  }

  filialPesquisar (searchText) {
    this.filial.pagination.page = 0

    return this.filialApplyPagination(searchText ? (searchText.indexOf('*') >= 0 ? '' : `*${searchText}*`) : '')
  }

  filialPreviousPage () {
    if (this.filial.pagination.page === 0) {
      return
    }

    this.filial.pagination.page -= 1

    return this.filialApplyPagination()
  }

  filialNextPage () {
    if (this.filial.pagination.page === this.filial.pagination.totalPages - 1) {
      return
    }

    this.filial.pagination.page += 1

    return this.filialApplyPagination()
  }

  filialApplyPagination (search) {
    const queryFields = []

    if (search) {
      queryFields.push(['branch_name', `"${search}"`])
    } else {
      if (this.branchReference.branch) {
        queryFields.push(['branch_reference_id', this.branchReference.branch.id])
      } else {
        queryFields.push(['NOT branch_reference_id', '*'])
      }
    }

    const params = {
      entity: 'branch',
      page: this.filial.pagination.page,
      limit: this.filial.pagination.limit,
      query: queryFields,
      sort: `${this.filial.order.predicate} ${this.filial.order.reverse ? 'desc' : 'asc'}`
    }

    this.filial.filiais = []

    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then(this.successBranches.bind(this))
      .catch(this.errorBranches.bind(this))
  }

  cleanPagination () {
    this.filial.filiais = []
    this.filial.pagination.totalPages = 1
    this.filial.pagination.page = 0
    this.filial.pagination.range = Array.apply(null, Array(this.filial.pagination.totalPages)).map((_, i) => i)
  }

  successBranches (data) {
    this.filial.filiais = data.data || []
    this.filial.pagination.totalPages = data.totalPages
    this.filial.pagination.page = data.page
    this.filial.pagination.range = Array.apply(null, Array(data.totalPages)).map((_, i) => i)
  }

  errorBranches (error) {
    this.alert.error(error?.data ? error.data.message : 'Erro ao tentar obter as Filiais')
  }

  filialGetSections (filial) {
    if (this.branchReference.branch || !filial || filial.filialId) {
      return
    }

    this.branchReference = {
      branch: filial,
      page: this.filial.pagination.page
    }

    this.filial.search = ''

    this.cleanPagination()
    this.filialGoToPage(0, true)
  }

  filialGetRoot () {
    this.branchReference.branch = null
    this.filial.search = ''

    this.cleanPagination()
    this.filialGoToPage(this.branchReference.page, true)
  }

  filialOpenModalForm (doing, title, btn, filial) {
    this.filial.modalForm.doing = doing
    this.filial.modalForm.title = title
    this.filial.modalForm.button = btn

    this.filialClearModalForm()

    $('#modalForm').modal('show')

    if (angular.isDefined(filial) && angular.isDefined(filial.id)) {
      this.filial.modalForm.model = angular.copy(filial)
    }

    this.filial.modalForm.model.empresaId = this.empresa.id
    this.filial.modalForm.model.filialId = this.branchReference.branch?.id
    this.filial.modalForm.model.filialReferenciaNome = this.branchReference.branch?.nome
    this.filial.modalForm.model.tipo = this.branchReference.branch ? 'USER' : 'GENERAL'
  }

  filialClearModalForm () {
    for (const i in this.filial.modalForm.model) {
      this.filial.modalForm.model[i] = typeof this.filial.modalForm.model[i] === 'boolean' ? false : ''
    }
    this.filial.modalForm.validations = {}
  }

  filialSaveModalForm () {
    if (!this.filialValidationModalForm()) {
      return
    }
    return this.filial.modalForm.doing === 'new' ? this.filialCreate() : this.filialUpdate()
  }

  filialValidationModalForm () {
    let isValid = true
    this.filial.modalForm.validations = {}
    if (!this.filial.modalForm.model.nome) {
      isValid = false
      this.filial.modalForm.validations.nome = 'Campo requerido!'
    }
    return isValid
  }

  filialCreate () {
    const body = {
      nome: this.filial.modalForm.model.nome,
      empresaId: this.filial.modalForm.model.empresaId,
      filialId: this.filial.modalForm.model.filialId || '',
      tipo: this.filial.modalForm.model.tipo
    }

    this.resource(`${this.apiUrl}/filial`).save(body).$promise
      .then((data) => {
        this.filial.filiais.push(data)
        this.alert.success('Filial "' + data.nome + '" criada com sucesso!')
        $('#modalForm').modal('hide')
      })
      .catch((error) => {
        this.alert.error(error?.data ? error.data.message : 'Ocorreu um erro inesperado!')
      })
  }

  filialUpdate () {
    const body = {}
    for (const i in this.filial.modalForm.model) {
      if (angular.isDefined(this.filial.modalForm.model[i])) {
        body[i] = this.filial.modalForm.model[i]
      }
    }
    if (body.empresaId) {
      delete body.empresaId
    }
    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/filial/` + this.filial.modalForm.model.id, null, { update: { method: 'PUT' } }).update(body).$promise
      .then((data) => {
        this.filial.filiais.map((filial) => {
          if (filial.id === data.id) {
            filial.nome = data.nome
          }
          return filial
        })
        this.alert.success('Filial "' + data.nome + '" atualizada com sucesso!')
        $('#modalForm').modal('hide')
      })
      .catch((error) => {
        this.alert.error(error?.data ? error.data.message : 'Ocorreu um erro inesperado!')
      })
  }

  filialDelete (filial) {
    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/filial/` + filial.id).delete().$promise
      .then((data) => {
        this.filial.filiais.some((data, i) => {
          if (data.id === filial.id) {
            this.filial.filiais.splice(i, 1)
            this.alert.success('Filial "' + data.nome + '" deletada com sucesso!')
            return true
          }
          return false
        })
      })
      .catch((error) => {
        this.alert.error(error?.message || error.data.message || 'Ocorreu um erro inesperado!')
      })
  }
}

angular.module('eticca.admin').controller('admin.company', [
  '$resource',
  'userService',
  'cloudSearchQuery',
  '$http',
  'alertService',
  Company
])
