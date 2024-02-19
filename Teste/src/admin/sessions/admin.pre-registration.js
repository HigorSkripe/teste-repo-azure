import * as cpfFunction from '@fnando/cpf'
import { equals, isEmpty, trim } from 'ramda'

class PreRegistration {
  constructor (resource, http, alert, user, cloudSearchQuery, localStorage) {
    this.resource = resource
    this.http = http
    this.alert = alert
    this.user = user
    this.cloudSearchQuery = cloudSearchQuery
    this.localStorage = localStorage
    this.apiUrl = window.__API_URL
    this.appRef = 'ADMIN'
    this.pagination = {
      search: '',
      grupoId: '',
      limit: 50,
      totalPages: 0,
      page: 0,
      list: [],
      range: [],
      orderBy: {
        key: 'preregister_email',
        order: 'asc'
      },
      order: {
        predicate: 'preregister_email',
        reverse: false
      },
      next: this.nextPage.bind(this),
      prev: this.previousPage.bind(this),
      goTo: this.goToPage.bind(this)
    }
    this.progress = {
      visible: false,
      keep: false,
      complete: 0
    }

    /* Select grupos */
    this.fullGroups = []
    this.dropGrupos = []

    /* Select programas */
    this.programas = []
    this.selectedPrograms = []
    this.programSelected = null
    this.grupoProgramas = {
    }

    /* Select branches */
    this.allBranches = []
    this.branches = []
    this.sections = []
    this.defaultFiliais = [
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
    this.filiaisSearch = []
    this.filialSelected = this.defaultFiliais[0]

    this.modalFormSingle = {
      nome: '',
      email: '',
      cpf: '',
      filialId: '',
      secaoId: '',
      grupoId: '',
      informProgram: 'false',
      error: {}
    }
    this.modalFormMulti = {
      grupoId: '',
      filialId: '',
      secaoId: '',
      fileModel: null,
      informProgram: 'false',
      error: {}
    }

    this.sendingRequest = false
    this.sendingPreRegister = false
    /* eslint-disable-next-line no-useless-escape */
    this.emailPatern = /^([0-9a-zA-Z+]|[-_\\.\:])+@([0-9a-zA-Z]([-_\\.]*[0-9a-zA-Z]+)*)[\\.]([a-zA-Z]{2,9})$/

    this._onInit()
  }

  cleanSectionInfo () {
    /** Dados para seção */
    this.secaoHabilitada = false
    this.secaoChaveNome = 'Seção'
  }

  _onInit () {
    /* Load all groups to fill the drops into forms */
    this.loadGroups()

    /** 1 - Buscando dados da company */
    this.cleanSectionInfo()
    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/empresa`, {}, { query: { method: 'GET' } }).query({}).$promise
      .then((data) => {
        this.secaoHabilitada = data && data.secaoHabilitada ? data.secaoHabilitada : false

        /** 2 - Buscando o valor da chave de tradução da seção da filial */
        this.secaoChaveNome = window.i18n('#secao')
      })
      .catch(this.cleanSectionInfo.bind(this))

    /* Buscando os grupos */
    const params = {
      entity: 'usergroup',
      page: 0,
      limit: 20
    }
    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then((data) => {
        if (!data || !data.data || !data.data.length) {
          this.selectedGrupo = JSON.parse(localStorage.getItem('userGroupName')) || 'Colaboradores'
          this.dropGrupos = [{ nome: this.selectedGrupo }]
        } else {
          this.dropGrupos = data.data
          this.selectedGrupo = JSON.parse(localStorage.getItem('userGroupName')) || this.dropGrupos[0].nome
        }
        this.update()
      })
      .catch(error => {
        console.error(error)
        this.handleError({ data: { message: 'Ocorreu um erro ao buscar os Grupos' } })
      })

    /* Buscando as filiais para cadastro dos preregistros */
    const branchParams = {
      entity: 'branch',
      page: 0,
      limit: 500,
      query: [],
      sort: 'branch_name asc'
    }
    this.cloudSearchQuery.getPage(branchParams)
      .then((data) => {
        this.allBranches = data.data
        this.branches = this.allBranches.filter(branch => !branch.filialId)
      })
      .catch(error => {
        console.error(error)
        this.handleError({ data: { message: 'Ocorreu um erro ao buscar todas as Filiais' } })
      })
  }

  async update () {
    try {
      /* Buscando os programas */
      const programResult = await this.getProgramsByGroupName(this.selectedGrupo)
      this.programas = programResult.data
      this.grupoProgramas[this.getActualGroupId()] = this.programas

      /* Buscando as filiais entre os preregisters */
      const branchParams = {
        entity: 'preregister',
        type: 'facet',
        query: [['preregister_group_name', `"${this.selectedGrupo}"`]],
        facets: [['preregister_branch_name', 'filiais']]
      }
      const branchResult = await this.cloudSearchQuery.getPage(branchParams)
      this.filiaisSearch = [...this.defaultFiliais, ...branchResult.facets.filiais]

      this.updateFilial()
    } catch (error) {
      console.error(error)
      this.handleError({ data: { message: 'Ocorreu um erro ao buscar Programas/Filiais' } })
    }
  }

  updateFilial () {
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
    const queryFields = [
      ['preregister_group_name', `"${this.selectedGrupo}"`]
    ]

    if (search) {
      queryFields.push(['preregister_email', `"${search}"`])
    }
    if (this.filialSelected) {
      if (this.filialSelected.nome && !this.defaultBranchSelected(this.filialSelected.nome)) {
        queryFields.push(['preregister_branch_name', `"${this.filialSelected.nome}"`])
      } else if (!this.filialSelected.todas) {
        queryFields.push(['NOT preregister_branch_name', '*'])
      }
    }

    const params = {
      entity: 'preregister',
      page: this.pagination.page,
      limit: this.pagination.limit,
      query: queryFields,
      sort: `${this.pagination.orderBy.key} ${this.pagination.orderBy.order}`
    }

    this.pagination.list = []

    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then(this.successPreUsers.bind(this))
      .catch(this.catchPreUsers.bind(this))
  }

  successPreUsers (data) {
    this.pagination.list = data.data
    this.pagination.totalPages = data.totalPages
    this.pagination.page = data.page
    this.pagination.range = Array.apply(null, Array(data.totalPages)).map((_, i) => {
      return i
    })
  }

  catchPreUsers (error) {
    this.sendingPreRegister = false
    this.alert.error(error?.data?.message || 'Erro ao tentar obter os Grupos de Usuários')
  }

  handleError (error) {
    this.alert.error(error && error.data ? error.data.message : 'Ocorreu um erro inesperado!')
  }

  /* istanbul ignore next */
  removePreUsersOfList (preUser) {
    this.pagination.list.some((el, i) => {
      if (el.id === preUser.id) {
        this.pagination.list.splice(i, 1)
        return true
      }
      return false
    })
  }

  enableSendingRequest () {
    this.sendingRequest = true
  }

  disableSendingRequest () {
    this.sendingRequest = false
  }

  /* istanbul ignore next */
  deletePreUser (preUser) {
    this.enableSendingRequest()
    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/colaborador/registrar/:id`).delete({ id: preUser.id }).$promise
      .then(() => {
        this.alert.success('Pré-cadastro "' + preUser.email + '" apagado com sucesso!')
        this.removePreUsersOfList(preUser)
        this.disableSendingRequest()
      })
      .catch(error => {
        this.alert.error(error?.data?.message || 'Erro ao tentar remover o email')
        this.disableSendingRequest()
      })
  }

  /* istanbul ignore next */
  resendInvite (preUser) {
    this.enableSendingRequest()
    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/colaborador/naoregistrado/reenviar`).save({ id: preUser.id }).$promise
      .then(() => {
        this.alert.success('Convite enviado para "' + preUser.email + '"!')
        this.disableSendingRequest()
      })
      .catch(error => {
        this.alert.error(error?.data?.message || 'Erro ao tentar enviar o convite')
        this.disableSendingRequest()
      })
  }

  addProgramList (selectedProgram) {
    const alreadyAdded = this.selectedPrograms.some(program => selectedProgram.id === program.id)

    if (!alreadyAdded) {
      this.selectedPrograms.push(selectedProgram)
    }
  }

  removeProgramList (selectedProgram) {
    let index = -1
    const remove = this.selectedPrograms.some((program, i) => {
      if (selectedProgram.id === program.id) {
        index = i
        return true
      } else {
        return false
      }
    })

    if (remove) {
      this.selectedPrograms.splice(index, 1)
    }
  }

  sortProgram (sortedProgram, action) {
    let index = -1
    let auxProgram = {}

    this.selectedPrograms.some((program, i) => {
      if (sortedProgram.id === program.id) {
        index = i
        return true
      } else {
        return false
      }
    })

    if (action === 'up') {
      if (index === 0) {
        return
      }
      auxProgram = this.selectedPrograms[index]
      this.selectedPrograms[index] = this.selectedPrograms[index - 1]
      this.selectedPrograms[index - 1] = auxProgram
    }
    if (action === 'down') {
      if (index === (this.selectedPrograms.length - 1)) {
        return
      }
      auxProgram = this.selectedPrograms[index]
      this.selectedPrograms[index] = this.selectedPrograms[index + 1]
      this.selectedPrograms[index + 1] = auxProgram
    }
  }

  branchValidate (formName) {
    this[formName].error.filialId = typeof this[formName].filialId === 'boolean' || !this[formName].filialId
    this.sendingPreRegister = false

    return this[formName].error.filialId
  }

  nomeValidate () {
    this.modalFormSingle.error.nome = trim(this.modalFormSingle.nome || '').split(' ').length < 2
    this.sendingPreRegister = false

    return this.modalFormSingle.error.nome
  }

  emailValidate () {
    this.modalFormSingle.error.email = !this.emailPatern.test(this.modalFormSingle.email)
    this.sendingPreRegister = false

    return this.modalFormSingle.error.email
  }

  cpfValidate () {
    this.modalFormSingle.error.cpf = !cpfFunction.isValid(this.modalFormSingle.cpf)
    this.sendingPreRegister = false

    return this.modalFormSingle.error.cpf
  }

  saveSingle () {
    /** Applying validations on fields */
    if (this.branchValidate('modalFormSingle')) return
    if (this.nomeValidate()) return
    if (this.emailValidate()) return
    if (this.cpfValidate()) return

    this.sendingPreRegister = true

    const informProgram = this.modalFormSingle.informProgram === 'true'
    const modalFormSingle = {
      grupoId: this.modalFormSingle.grupoId,
      filialId: this.modalFormSingle.filialId,
      secaoId: this.modalFormSingle.secaoId,
      nome: trim(this.modalFormSingle.nome),
      cpf: cpfFunction.strip(this.modalFormSingle.cpf),
      email: trim(this.modalFormSingle.email),
      informProgram,
      selectedPrograms: this.selectedPrograms.map(program => program.id)
    }

    const actualGroupId = this.getActualGroupId()

    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/colaborador/registrar`).save(modalFormSingle).$promise
      .then((data) => {
        this.removePreUsersOfList(data)

        if (equals(actualGroupId, data.grupoId)) {
          this.pagination.list.push({
            ...data,
            filial: this.getBranch(data.filialId),
            secao: this.getBranch(data.secaoId)
          })
          this.alert.success(`"${data.email}" adicionado com sucesso!`)
        } else {
          this.alert.success(`"${data.email}" adicionado com sucesso no Grupo '${this.getGroupName(data.grupoId)}'!`)
        }

        this.sendingPreRegister = false
        $('#modalFormSingle').modal('hide')
      })
      .catch(this.catchPreUsers.bind(this))
  }

  async sendFile () {
    try {
      if (this.branchValidate('modalFormMulti')) return
      if (!this.modalFormMulti.fileModel || isEmpty(this.modalFormMulti.fileModel)) {
        this.alert.error('Selecione um arquivo antes enviar.')
        return
      }

      this.startProgress()
      this.sendingPreRegister = true
      const actualGroupId = this.getActualGroupId()

      const informProgram = this.modalFormMulti.informProgram === 'true'
      const params = {
        grupoId: this.modalFormMulti.grupoId,
        filialId: this.modalFormMulti.filialId,
        secaoId: this.modalFormMulti.secaoId,
        informProgram,
        selectedPrograms: this.selectedPrograms.map(program => program.id),
        file: {
          filename: this.modalFormMulti.fileModel[0].name,
          size: this.modalFormMulti.fileModel[0].size,
          mimetype: this.modalFormMulti.fileModel[0].type
        }
      }

      const signedUrl = await this.http.post(`${this.apiUrl}/colaborador/bulkregister`, params)
      if (!signedUrl || !signedUrl.data || !signedUrl.data.url) {
        return this.handleError({ data: { message: 'Não foi possível gerar a url para o envio do arquivo' } })
      }

      const oldFile = this.modalFormMulti.fileModel[0]
      const blob = oldFile.slice(0, oldFile.size, signedUrl.data.contentType)
      const file = new File([blob], signedUrl.data.filename, { type: signedUrl.data.contentType })

      await fetch(signedUrl.data.url, {
        method: 'PUT',
        body: file
      })

      const successMessage = equals(actualGroupId, this.modalFormMulti.grupoId)
        ? 'Arquivo enviado com sucesso! Os dados padronizados contidos no arquivo estão sendo processados e logo serão exibidos na listagem.'
        : `Arquivo enviado com sucesso! Os dados padronizados contidos no arquivo estão sendo processados e logo serão exibidos na listagem do Grupo '${this.getGroupName(this.modalFormMulti.grupoId)}'`
      this.completeProgress(successMessage, true)
    } catch (error) {
      this.completeProgress(error.data.message, false)
    }
  }

  openModalFormSingle () {
    this.clearModalFormSingle()
    if (this.filialSelected && this.filialSelected.nome) {
      this.modalFormSingle.filialId = this.defaultBranchSelected(this.filialSelected.nome)
      this.changeBranch('modalFormSingle', this.modalFormSingle.filialId)
    }
    this.programas = this.grupoProgramas[this.getActualGroupId()]
    $('#modalFormSingle').modal('show')
  }

  openModalFormMulti () {
    this.clearModalFormMulti()
    if (this.filialSelected && this.filialSelected.nome) {
      this.modalFormMulti.filialId = this.defaultBranchSelected(this.filialSelected.nome)
      this.changeBranch('modalFormMulti', this.modalFormMulti.filialId)
    }
    this.programas = this.grupoProgramas[this.getActualGroupId()]
    $('#modalFormMulti').modal('show')
  }

  clearModalFormSingle () {
    this.modalFormSingle = {
      grupoId: this.getActualGroupId(),
      filialId: '',
      secaoId: '',
      nome: '',
      email: '',
      cpf: '',
      informProgram: 'false',
      error: {}
    }
    this.clearModalFieldDefault()
  }

  clearModalFormMulti () {
    this.modalFormMulti = {
      grupoId: this.getActualGroupId(),
      filialId: '',
      secaoId: '',
      fileModel: null,
      informProgram: 'false',
      error: {}
    }
    this.progress.visible = false
    this.progress.complete = 0
    this.clearModalFieldDefault()
  }

  clearModalFieldDefault () {
    this.programSelected = null
    this.selectedPrograms = []
    this.sections = []
  }

  /* Progress */
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
        $('#progressQuiz').css({ width: this.progress.complete.toString() + '%' })
        return this.keepProgress(n)
      }
    }, time)
  }

  completeProgress (message, success) {
    this.sendingPreRegister = false
    this.progress.keep = false
    this.progress.complete = 100
    $('#progressQuiz').css({ width: this.progress.complete.toString() + '%' })

    setTimeout(() => {
      this.clearModalFormMulti()
      $('#modalFormMulti').modal('hide')

      if (success) {
        this.alert.success(message)
      } else {
        this.alert.error(message)
      }
    }, 800)
  }

  loadGroups () {
    if (this.fullGroups.length === 0) {
      const params = {
        entity: 'usergroup',
        page: 0,
        limit: 20
      }

      /* istanbul ignore next */
      this.cloudSearchQuery.getPage(params)
        .then((data) => {
          this.fullGroups = data.data
        })
    }
  }

  getBranchId (branchName) {
    const branch = this.allBranches.find(branch => branch.nome === branchName)

    return branch ? branch.id : ''
  }

  getBranch (branchId, branchName) {
    if (branchName) return branchName

    const branch = this.allBranches.find(branch => branch.id === branchId)

    return branch ? branch.nome : '-'
  }

  defaultBranchSelected (branchName) {
    return this.defaultFiliais.some(a => a.nome === branchName)
  }

  getActualGroupId () {
    const grupo = this.fullGroups.find(a => a.nome === this.selectedGrupo)

    return grupo ? grupo?.id || '' : ''
  }

  getGroupName (groupId) {
    const grupo = this.fullGroups.find(a => a.id === groupId)

    return grupo ? grupo?.nome || '' : ''
  }

  getProgramsByGroupName (groupName) {
    /* Buscando os programas */
    const programParams = {
      entity: 'program',
      page: 0,
      limit: 20,
      query: [['program_group_name', `"${groupName}"`], ['AND (enabled', `${1} OR`], ['enabled', `${0})`]],
      sort: 'created_at asc'
    }
    return this.cloudSearchQuery.getPage(programParams)
  }

  async changeGroup (formName) {
    this.clearModalFieldDefault()
    this[formName].error.grupoId = false
    this[formName].informProgram = 'false'

    const groupId = this[formName].grupoId

    if (this.grupoProgramas[groupId]) {
      this.programas = this.grupoProgramas[groupId]

      return
    }

    const groupName = this.getGroupName(groupId)
    const programs = await this.getProgramsByGroupName(groupName)

    this.grupoProgramas[groupId] = programs.data
    this.programas = programs.data
  }

  async changeBranch (formName, branchId) {
    this[formName].secaoId = ''
    this.sections = this.allBranches.filter(branch => branch.filialId === branchId)
  }
}

angular.module('eticca.admin').controller('admin.pre-registration', [
  '$resource',
  '$http',
  'alertService',
  'userService',
  'cloudSearchQuery',
  'storageService',
  PreRegistration
])
