import moment from 'moment'
import { includes, is, isEmpty, not } from 'ramda'

import * as authType from '../../common/config/auth'

class Users {
  constructor (http, resource, timeout, cloudSearchQuery, user, alert, scope, localStorage, authService) {
    this.http = http
    this.resource = resource
    this.timeout = timeout
    this.cloudSearchQuery = cloudSearchQuery
    this.user = user
    this.alert = alert
    this.scope = scope
    this.localStorage = localStorage
    this.auth = authService
    this.apiUrl = window.__API_URL
    this.appRef = 'ADMIN'

    const alias = authService.getActualAlias()
    this.isEnterprise = Object.keys(authType.cognito).some(currAlias => currAlias === alias)

    this.etapas = [
      {
        id: 'certificacao',
        text: 'Certificação',
        order: 4
      },
      {
        id: 'codigoconduta',
        text: window.keyCodigo('codigo_conduta'),
        order: 3
      },
      {
        id: 'codigoetica',
        text: window.keyCodigo('codigo_etica'),
        order: 2
      },
      {
        id: 'introducao',
        text: window.keyCodigo('intro'),
        order: 0
      },
      {
        id: 'termoaceite',
        text: 'Termo de Aceite',
        order: 5
      },
      {
        id: 'treinamento',
        text: 'Treinamento',
        order: 1
      }
    ]
    this.pagination = {
      search: '',
      groupId: '',
      groupName: '',
      totalPages: 0,
      page: 0,
      limit: 25,
      range: [],
      list: [],
      order: {
        predicate: 'userprogress_user_name',
        reverse: false
      },
      next: this.nextPage.bind(this),
      prev: this.previousPage.bind(this),
      goTo: this.goToPage.bind(this)
    }
    this.modalPerfil = {
      model: {
        id: '',
        perm: '',
        isAdmin: false,
        isOperador: false
      },
      open: this.openModalPerfil.bind(this),
      save: this.saveModalPerfil.bind(this),
      changePermissaoP: this.changePermissaoP.bind(this)
    }
    this.modalGrupo = {
      model: {
        id: '',
        grupoId: ''
      },
      open: this.openModalGrupo.bind(this),
      save: this.saveModalGrupo.bind(this)
    }
    this.modalForm = {
      emailPatern: '/^([0-9a-zA-Z]([-_\\.]*[0-9a-zA-Z]+)*)@([0-9a-zA-Z]([-_\\.]*[0-9a-zA-Z]+)*)[\\.]([a-zA-Z]{2,9})$/',
      title: '',
      doing: '',
      button: '',
      model: {
        nome: '',
        email: '',
        cpf: '',
        senha: '',
        ticketSenha: false,
        grupoId: '',
        confirmSenha: '',
        isAdmin: false,
        isOperador: false,
        isAtivo: true,
        removerEstatistica: false,
        informProgram: 'false'
      },
      error: {
        nome: false,
        cpf: false,
        email: false,
        senha: false,
        confirmSenha: false,
        filialId: false
      },
      sendRequest: false,
      clearModalForm: this.clearModalForm.bind(this),
      open: this.openModalForm.bind(this),
      save: this.saveModalForm.bind(this),
      changePermissao: this.changePermissao.bind(this)
    }

    this.userDetail = null
    this.userTicketPassword = null

    /* Grupos */
    this.dropGrupos = []
    this.fullGroups = []

    /* Programas */
    this.programas = []
    this.listaUsuariosModel = {}
    this.programSelected = null
    this.selectedPrograms = []
    this.programasListaUsuario = []
    this.fullPrograms = []

    /* Select filiais */
    this.filiais = []
    this.filiaisSearch = []
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
    this.userLastFilialId = ''
    this.filialSelected = this.defaultFiliais[0]

    /* Select users active */
    this.usersListActiveModel = {}
    this.usersListActive = [
      {
        name: 'Todos',
        value: undefined
      },
      {
        name: 'Ativos',
        value: true
      },
      {
        name: 'Inativos',
        value: false
      }
    ]

    /* Select users progress */
    this.usersListProgressModel = {}
    this.usersListProgress = [
      {
        name: 'Todos',
        value: undefined
      },
      {
        name: 'Concluiu o Programa',
        value: true
      },
      {
        name: 'Não Concluiu o Programa',
        value: false
      }
    ]

    this._onInit()
  }

  cleanSectionInfo () {
    /** Dados para seção */
    this.secaoHabilitada = false
    this.secaoChaveNome = 'Seção'
  }

  _onInit () {
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

    /* Buscando as filiais apenas registradas nos usuários */
    const params = {
      entity: 'userprogress',
      type: 'facet',
      facets: [['userprogress_group_name', 'grupos']]
    }
    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then((data) => {
        /* Preenchendo a lista de grupos */
        if (!data || !data.facets || !data.facets.grupos || !data.facets.grupos.length) {
          this.selectedGrupo = JSON.parse(localStorage.getItem('userGroupName')) || 'Colaboradores'
          this.dropGrupos = [{ nome: this.selectedGrupo }]
        } else {
          this.dropGrupos = data.facets.grupos
          this.selectedGrupo = JSON.parse(localStorage.getItem('userGroupName')) || this.dropGrupos[0].nome
        }

        this.update()
      })
      .catch(error => {
        console.log(error)
        this.alert.error('Ocorreu um erro ao buscar os Grupos')
      })

    /* Buscando as filiais para cadastro dos preregistros */
    const branchParams = {
      entity: 'branch',
      page: 0,
      limit: 100,
      query: [],
      sort: 'branch_name asc'
    }
    this.cloudSearchQuery.getPage(branchParams)
      .then((data) => {
        /* Preenchendo a lista de filiais com o resultado da busca mantendo as filiais padrões no início */
        this.filiais = data.data
      })
      .catch(error => {
        console.error(error)
        this.handleError({ data: { message: 'Ocorreu um erro ao buscar todas as Filiais' } })
      })
  }

  async update () {
    try {
      this.pagination.groupName = this.selectedGrupo

      /* Buscando os programas */
      const userProgressSearshParams = {
        entity: 'userprogress',
        type: 'facet',
        query: [['userprogress_group_name', `"${this.pagination.groupName}"`]],
        facets: [['userprogress_program_version', 'programas']]
      }
      const userProgressResult = await this.cloudSearchQuery.getPage(userProgressSearshParams)
      this.programasListaUsuario = userProgressResult.facets.programas.length ? userProgressResult.facets.programas : []

      /* Buscando o programa ativo */
      const params = {
        entity: 'program',
        page: 0,
        limit: 1,
        query: [['program_group_name', `"${this.pagination.groupName}"`]],
        sort: 'created_at asc'
      }
      const programResult = await this.cloudSearchQuery.getPage(params)
      /* Selecionando a versão do programa no dropdown */
      this.listaUsuariosModel = programResult.data && programResult.data.length
        ? this.programasListaUsuario.find(a => a.nome === programResult.data[0].versao)
        : this.programasListaUsuario[0]

      /* Selecionando usuários ativo no dropdown */
      this.usersListActiveModel = this.usersListActive[1]
      /* Selecionando usuários pelo progresso */
      this.usersListProgressModel = this.usersListProgress[0]

      /* Buscando as filiais entre os usuários */
      const branchParams = {
        entity: 'userprogress',
        type: 'facet',
        query: [['userprogress_group_name', `"${this.pagination.groupName}"`]],
        facets: [['userprogress_branch_name', 'filiais']]
      }
      const branchResult = await this.cloudSearchQuery.getPage(branchParams)
      this.filiaisSearch = [...this.defaultFiliais, ...branchResult.facets.filiais]

      /* Atualizando a lista de usuários no grid */
      this.goToPage(0, true)
    } catch (error) {
      console.log({ message: 'Erro ao buscar os programas', error })
      this.alert.error('Ocorreu um erro inesperado!')
    }
  }

  /* Limpando o campo de pesquisa */
  cleanSearch () {
    this.search = ''
    this.pagination.page = 0
    this.pagination.range = [0]
  }

  updateFilialList () {
    this.cleanSearch()
    return this.applyPagination()
  }

  updateUsersListActive () {
    this.cleanSearch()
    return this.applyPagination()
  }

  updateUsersListProgress () {
    this.cleanSearch()
    return this.applyPagination()
  }

  pesquisar (searchText) {
    this.pagination.page = 0

    /* Selecionando usuários ativo no dropdown */
    this.usersListActiveModel = this.usersListActive[0]

    /* Selecionando usuários pelo progresso */
    this.usersListProgressModel = this.usersListProgress[0]

    return this.applyPagination(searchText ? (searchText.indexOf('*') >= 0 ? '' : `*${searchText}*`) : '')
  }

  orderBy (predicate) {
    this.pagination.order.reverse = this.pagination.order.predicate !== predicate ? false : !this.pagination.order.reverse
    this.pagination.order.predicate = predicate
    this.goToPage(0, false, true)
  }

  goToPage (page, first, ordering) {
    if (this.pagination.page === page && !first && !ordering) {
      return
    }

    this.pagination.page = page

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

  applyPagination (search) {
    const queryFields = [['userprogress_group_name', `"${this.pagination.groupName}"`], ['userprogress_program_version', `"${this.listaUsuariosModel?.nome}"`]]

    this.pagination.list = []

    if (search) {
      // Pesquisa em user
      // Busca por seus progressos
      queryFields.push(['(userprogress_user_name', `"${search}"`])
      queryFields.push(['OR userprogress_user_email', `"${search}")`])
    }

    if (this.usersListActiveModel.value !== undefined) {
      queryFields.push(['enabled', this.usersListActiveModel.value ? 1 : 0])
    } else {
      queryFields.push(['(enabled', `${1} OR`])
      queryFields.push(['enabled', `${0})`])
    }

    if (this.filialSelected) {
      if (this.filialSelected.nome && !this.defaultFiliais.some(a => a.nome === this.filialSelected.nome)) {
        queryFields.push(['userprogress_branch_name', `"${this.filialSelected.nome}"`])
      } else if (!this.filialSelected.todas) {
        queryFields.push(['NOT userprogress_branch_name', '*'])
      }
    }
    if (this.usersListProgressModel.value !== undefined) {
      queryFields.push([this.usersListProgressModel.value ? 'userprogress_progress' : 'NOT userprogress_progress', 100])
    }

    const params = {
      entity: 'userprogress',
      page: this.pagination.page,
      limit: this.pagination.limit,
      query: queryFields,
      sort: `${this.pagination.order.predicate} ${this.pagination.order.reverse ? 'desc' : 'asc'}`
    }

    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then(this.successUsersByUsers.bind(this))
      .catch(this.errorUsers.bind(this))
  }

  successUsersByUsers (data) {
    this.pagination.list = data.data
    this.pagination.totalPages = data.totalPages
    this.pagination.page = data.page
    this.pagination.range = Array.apply(null, Array(data.totalPages)).map((_, i) => i)
  }

  errorUsers (error) {
    console.log(error?.data?.message)
    this.alert.error('Erro ao tentar buscar os Usuários')
  }

  viewPrograma (programa) {
    this.programaSelecionado = angular.copy(programa)
    this.substituirNomesDocumento(this.programaSelecionado.itens.documento)
  }

  substituirNomesDocumento (idDocumento) {
    this.etapas.forEach((el) => {
      const specialDoc = {
        introducao: 'intro',
        codigoetica: 'codigo_etica',
        codigoconduta: 'codigo_conduta'
      }

      if (includes(el.id, ['codigoetica', 'codigoconduta', 'introducao'])) {
        /* istanbul ignore next */
        this.resource(`${this.apiUrl}/documento/` + specialDoc[el.id] + '/' + idDocumento).get().$promise
          .then((data) => {
            if (data.titulo) {
              el.text = data.titulo
              /* scope.$apply() */
            }
          }, (error) => {
            this.alert.error(error && error.data ? error.data.message : 'Ocorreu um erro inesperado!')
          })
          .catch((error) => {
            this.alert.error(error && error.data ? error.data.message : 'Ocorreu um erro inesperado!')
          })
      }
    })
  }

  clearModalForm () {
    for (const i in this.modalForm.model) {
      if (i !== 'grupoId') {
        this.modalForm.model[i] = typeof this.modalForm.model[i] === 'boolean' ? false : ''
      }

      this.programSelected = null
      this.selectedPrograms = []
    }

    this.modalForm.error = {
      nome: false,
      cpf: false,
      email: false,
      senha: false,
      confirmSenha: false,
      filialId: false
    }

    this.modalForm.model.isAtivo = true
    this.modalForm.model.ticketSenha = false
    this.modalForm.model.removerEstatistica = false
    this.modalForm.model.informProgram = 'false'
  }

  openModalForm (doing, title, btn, user) {
    $('#modalDetail').modal('hide')
    this.clearModalForm()

    /* Carregando todos os grupos */
    this.loadGroups()

    /* Carregando todos os programas */
    this.loadPrograms()

    this.modalForm.doing = doing
    this.modalForm.title = title
    this.modalForm.button = btn

    if (this.filialSelected && this.filialSelected.nome) {
      this.modalForm.model.filialId = this.getBranchIdByName(this.filialSelected.nome)
    }

    if (angular.isDefined(user)) {
      this.modalForm.model.nome = user.nome
      this.modalForm.model.cpf = user.cpf
      this.modalForm.model.email = user.email
      this.modalForm.model.isAtivo = user.isAtivo
      this.modalForm.model.removerEstatistica = user.removerEstatistica
      this.modalForm.model.isAdmin = user.isAdmin
      this.modalForm.model.isOperador = user.isOperador
      this.modalForm.model.id = user.id
      this.modalForm.model.grupoId = user.grupoId
      this.userLastFilialId = user.filialId

      if (user.filialId) {
        this.modalForm.model.filialId = user.filialId
      }

      setTimeout(() => {
        $('#modalForm').modal('show')
      }, 400)
    } else {
      this.modalForm.model.grupoId = this.getGroupId()
    }
  }

  openModalPerfil (doing, title, btn, user) {
    $('#modalDetail').modal('hide')
    if (angular.isDefined(user)) {
      this.modalPerfil.model.isAdmin = user.isAdmin
      this.modalPerfil.model.isOperador = user.isOperador
      this.modalPerfil.model.id = user.id
      if (user.isAdmin) {
        this.modalPerfil.model.perm = 'admin'
      } else if (user.isOperador) {
        this.modalPerfil.model.perm = 'opera'
      } else {
        this.modalPerfil.model.perm = ''
      }
      setTimeout(() => {
        $('#modalPerfil').modal('show')
      }, 400)
    }
  }

  openModalGrupo (doing, title, btn, user) {
    $('#modalDetail').modal('hide')
    if (angular.isDefined(user)) {
      this.modalGrupo.model.grupoId = user.grupoId
      this.modalGrupo.model.id = user.id
      setTimeout(() => {
        $('#modalGrupo').modal('show')
      }, 400)
    }
  }

  saveModalForm () {
    const fields = ['nome', 'email', 'cpf', 'senha', 'confirmSenha', 'filialId']
    fields.forEach(field => this.validField(field))

    if (fields.some(field => this.modalForm.error[field])) {
      return
    }

    if (this.modalForm.doing === 'new') {
      if (this.isEnterprise) {
        return
      }

      return this.createNew()
    }

    return this.saveEdit()
  }

  validField (field) {
    if (!field) return

    /* If ticketPassword is active doesn't valited the field */
    if ((this.modalForm.doing === 'edit' || this.modalForm.model.ticketSenha) && (field === 'senha' || field === 'confirmSenha')) return

    this.modalForm.error[field] = !this.modalForm.model[field] || not(is(String, this.modalForm.model[field]))

    if (field === 'cpf') {
      this.modalForm.error[field] = !this.validarCPF(this.modalForm.model.cpf)
    }

    if (field === 'email') {
      this.modalForm.error[field] = !this.validateEmail(this.modalForm.model.email)
    }
  }

  validarCPF (cpf) {
    if (!cpf || not(is(String, cpf))) return false

    cpf = cpf.replace(/[^\d]+/g, '')

    /* Elimina CPFs invalidos conhecidos */
    if (cpf.length !== 11 || cpf === '00000000000' || cpf === '11111111111' || cpf === '22222222222' || cpf === '33333333333' || cpf === '44444444444' || cpf === '55555555555' || cpf === '66666666666' || cpf === '77777777777' || cpf === '88888888888' || cpf === '99999999999') {
      return false
    }
    /* Valida 1o digito */
    let add = 0
    for (let i = 0; i < 9; i += 1) {
      add += parseInt(cpf.charAt(i), 10) * (10 - i)
    }
    let rev = 11 - add % 11
    if (rev === 10 || rev === 11) {
      rev = 0
    }
    if (rev !== parseInt(cpf.charAt(9), 10)) {
      return false
    }
    /* Valida 2o digito */
    add = 0
    for (let i = 0; i < 10; i += 1) {
      add += parseInt(cpf.charAt(i), 10) * (11 - i)
    }
    rev = 11 - add % 11
    if (rev === 10 || rev === 11) {
      rev = 0
    }
    if (rev !== parseInt(cpf.charAt(10), 10)) {
      return false
    }
    return true
  }

  validateEmail (email) {
    if (!email || not(is(String, email))) return false

    return /^([0-9a-zA-Z]([-_\\.]*[0-9a-zA-Z]+)*)@([0-9a-zA-Z]([-_\\.]*[0-9a-zA-Z]+)*)[\\.]([a-zA-Z]{2,9})$/.test(email)
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

  createNew () {
    if (this.isEnterprise) {
      return
    }

    const informProgram = this.modalForm.model.informProgram === 'true'
    const body = {
      grupoId: this.modalForm.model.grupoId,
      nome: this.modalForm.model.nome,
      email: this.modalForm.model.email,
      senha: this.modalForm.model.senha,
      ticketSenha: this.modalForm.model.ticketSenha,
      cpf: this.modalForm.model.cpf,
      filialId: this.modalForm.model.filialId,
      isAtivo: this.modalForm.model.isAtivo,
      removerEstatistica: this.modalForm.model.removerEstatistica,
      informProgram: informProgram,
      selectedPrograms: this.selectedPrograms.map(program => program.id)
    }

    this.resource(`${this.apiUrl}/colaborador`).save(body).$promise
      .then((data) => {
        this.pagination.list.push({
          ...data,
          filial: this.getBranch(data.filialId),
          secao: this.getBranch(data.secaoId),
          tentativasProva: 0,
          progresso: 0
        })
        this.alert.success('Usuário "' + data.nome + '" criado com sucesso!')
        $('#modalForm').modal('hide')
      })
      .catch((error) => {
        this.alert.error('Erro', error?.data ? error.data.message : 'Ocorreu um erro inesperado!')
      })
  }

  saveEdit () {
    const body = {
      nome: this.modalForm.model.nome,
      email: this.modalForm.model.email,
      ticketSenha: this.modalForm.model.ticketSenha,
      senha: this.modalForm.model.senha,
      cpf: this.modalForm.model.cpf,
      grupoId: this.modalForm.model.grupoId,
      filialId: this.modalForm.model.filialId,
      isAtivo: this.modalForm.model.isAtivo,
      removerEstatistica: this.modalForm.model.removerEstatistica,
      informProgram: this.modalForm.model.informProgram,
      selectedPrograms: this.selectedPrograms.map(program => program.id)
    }

    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/colaborador/` + this.modalForm.model.id, null, { update: { method: 'PUT' } }).update(body).$promise
      .then((data) => {
        this.pagination.list.map((user) => {
          if (user.id === data.id) {
            user.nome = data.nome
            user.email = data.email
            user.active = !!data.active
            user.removerEstatistica = data.removerEstatistica
            user.isAdmin = data.isAdmin
            user.isOperador = data.isOperador
            user.filialId = data.filialId
            user.secaoId = data.secaoId
            user.filial = this.getBranch(data.filialId)
            user.secao = this.getBranch(data.secaoId)
          }
          return user
        })
        if (data.filialId !== this.userLastFilialId && !this.filialSelected.todas) {
          this.pagination.list.some((u, i) => {
            if (u.id === data.id) {
              this.pagination.list.splice(i, 1)
              return true
            }
            return false
          })
        }

        this.alert.success('Usuário "' + this.modalForm.model.nome + '" atualizado com sucesso!')
        /* this.userDetail = null; */
        $('#modalForm').modal('hide')
      })
      .catch((error) => {
        this.alert.error(error && error.data ? error.data.message : 'Ocorreu um erro inesperado!')
      })
  }

  saveModalPerfil () {
    const body = {
      isAdmin: this.modalPerfil.model.isAdmin,
      isOperador: this.modalPerfil.model.isOperador
    }

    this.resource(`${this.apiUrl}/colaborador/` + this.modalPerfil.model.id, null, { update: { method: 'PUT' } }).update(body).$promise
      .then((data) => {
        this.pagination.list.map((user) => {
          if (user.id === data.id) {
            user.isAdmin = data.isAdmin
            user.isOperador = data.isOperador
          }
          return user
        })
        this.alert.success('Perfil atualizado com sucesso!')
        /* this.userDetail = null; */
        $('#modalPerfil').modal('hide')
      })
      .catch((error) => {
        this.alert.error(error?.data ? error.data.message : 'Ocorreu um erro inesperado!')
      })
  }

  saveModalGrupo () {
    const body = {
      grupoId: this.modalGrupo.model.grupoId
    }

    this.resource(`${this.apiUrl}/colaborador/` + this.modalGrupo.model.id, null, { update: { method: 'PUT' } }).update(body).$promise
      .then((data) => {
        this.pagination.list.map((user) => {
          if (user.id === data.id) {
            user.groupId = data.grupoId
          }
          return user
        })
        this.alert.success('Grupo atualizado com sucesso!')
        /* this.userDetail = null; */
        this.pagination.list.some((u, i) => {
          if (u.id === data.id) {
            this.pagination.list.splice(i, 1)
            return true
          }
          return false
        })
        $('#modalGrupo').modal('hide')
      })
      .catch((error) => {
        this.alert.error(error?.data ? error.data.message : 'Ocorreu um erro inesperado!')
      })
  }

  deleteUser (user) {
    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/colaborador/` + user.id).delete().$promise
      .then((data) => {
        this.pagination.list.some((u, i) => {
          if (u.id === user.id) {
            this.pagination.list.splice(i, 1)
            this.alert.success('Usuário deletado com sucesso!')
            return true
          }
          return false
        })
      })
      .catch((error) => {
        this.alert.error(error?.message || error.data.message || 'Ocorreu um erro inesperado!')
      })
  }

  editStatus (user) {
    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/colaborador/ativo/` + user.id, null, { update: { method: 'PUT' } }).update({ isAtivo: !user.active }).$promise
      .then((data) => {
        if (this.usersListActiveModel) {
          if (this.usersListActiveModel.name === 'Todos') {
            this.pagination.list.map((user) => {
              if (user.id === data.id) {
                user.active = !!data.active
              }
              return user
            })
          } else {
            this.pagination.list.some((u, i) => {
              if (u.id === user.id) {
                this.pagination.list.splice(i, 1)
                return true
              }
              return false
            })
          }
        }

        this.alert.success(`Usuário "${user.nome}" ${!user.active ? 'inativado' : 'ativado'} com sucesso!`)
        /* this.userDetail = null; */
        $('#modalForm').modal('hide')
      })
      .catch((error) => {
        this.alert.error(error?.data ? error.data.message : 'Ocorreu um erro inesperado!')
      })
  }

  viewUser (event, user) {
    const id = 'del_' + user.id
    const atvId = 'atv_' + user.id

    if (event.target.getAttribute('id') === id || event.target.parentElement.getAttribute('id') === id || event.target.getAttribute('id') === atvId || event.target.parentElement.getAttribute('id') === atvId) {
      return
    }

    /* Carregando todos os grupos */
    this.loadGroups()

    /* Carregando todos os programas */
    this.loadPrograms()

    /* resource('/colaborador/' + user.id + '?grupoId=' + user.grupoId).get().$promise */
    this.resource(`${this.apiUrl}/colaborador/` + user.id + '?grupoId=' + user.grupoId + '&allProvas=true&detail=true').get().$promise
      .then((data) => {
        this.userDetail = data
        this.selectedGrupoDetail = this.userDetail.grupoId

        /** Info das filiais */
        this.userDetail.filial = this.getBranch(this.userDetail.filialId)
        this.userDetail.secao = this.getBranch(this.userDetail.secaoId)

        /* Preparando os dados para para detalhamento dos grupos e programas do usuário */
        this.carregarProgramasGrupo()

        $('#modalDetail').modal('show')
      })
  }

  async resetPassword (user) {
    try {
      if (this.isEnterprise) {
        return
      }

      this.userTicketPassword = null

      $('#modalDetail').modal('hide')
      setTimeout(() => {
        $('#modalResetPassword').modal('show')
      }, 400)

      this.userTicketPassword = user

      const email = (is(Object, this.userTicketPassword) && this.userTicketPassword.email) ?? ''

      if (not(is(String, email)) || isEmpty(email)) {
        this.alert.error('Usuário não definido')
        return
      }

      const result = await this.http.post(`${this.apiUrl}/colaborador/resetpassword`, { email })
      const ticket = (is(Object, result) && is(Object, result.data) && result.data.ticket) ?? ''

      if (not(is(String, ticket)) || isEmpty(ticket)) {
        throw new Error()
      }

      $('#passwordTicket').attr('value', ticket)
    } catch (error) {
      this.alert.error('Ocorreu um erro ao gerar o ticket')
    }
  }

  carregarProgramasGrupo () {
    /* Pegando os programas do grupo selecionado */
    this.programasFiltrados = (this.userDetail.grupos || []).find((grupo) => grupo.id === this.selectedGrupoDetail).programas

    /* Pegando o programa ativo no grupo e carregando no modal */
    this.viewPrograma(this.programasFiltrados.find((prog) => prog.active))
  }

  changePermissao (permi) {
    switch (permi) {
      case 'admin':
        this.modalForm.model.isOperador = false
        break
      case 'opera':
        this.modalForm.model.isAdmin = false
        break
    }
  }

  changePermissaoP () {
    switch (this.modalPerfil.model.perm) {
      case 'admin':
        this.modalPerfil.model.isOperador = false
        this.modalPerfil.model.isAdmin = true
        break
      case 'opera':
        this.modalPerfil.model.isAdmin = false
        this.modalPerfil.model.isOperador = true
        break
      case '':
        this.modalPerfil.model.isAdmin = false
        this.modalPerfil.model.isOperador = false
        break
    }
  }

  async generateReport () {
    try {
      const searchGroupId = `grupoId=${this.getGroupId()}`
      const searchProgramVersion = `&programaVersion=${this.listaUsuariosModel && this.listaUsuariosModel.nome ? this.listaUsuariosModel.nome : ''}`
      const searchFieldSearch = this.search ? `&search=${this.search}` : ''
      const searchActive = typeof this.usersListActiveModel.value !== 'undefined' ? `&isAtivo=${this.usersListActiveModel.value}` : ''
      const searchProgress = typeof this.usersListProgressModel.value !== 'undefined' ? `&progresso=${this.usersListProgressModel.value}` : ''

      const searchBranch = (this.filialSelected && this.filialSelected.nome && !this.defaultFiliais.some(a => a.nome === this.filialSelected.nome))
        ? `&filialId=${this.getBranchIdByName(this.filialSelected.nome)}`
        : ''

      const urlUserReport = `/report/users/csv?${searchGroupId}${searchProgramVersion}${searchFieldSearch}${searchActive}${searchProgress}${searchBranch}&orderByKey=userName`

      const result = await this.http.get(`${this.apiUrl}${urlUserReport}`, { headers: { 'Content-Type': 'text/csv' }, responseType: 'arraybuffer' })
      const aLink = document.createElement('a')
      document.body.appendChild(aLink)

      const file = new Blob([result.data], { type: 'text/csv' })
      const fileURL = window.URL.createObjectURL(file)

      aLink.href = fileURL
      aLink.target = '_blank'
      aLink.download = `relatorio_colaboradores_${moment().format('YYYY-MM-DD_HH-mm-ss')}.csv`
      aLink.click()
      this.timeout(() => {
        document.body.removeChild(aLink)
      }, 1000)
    } catch (error) {
      console.error(error)
      this.alert.error('Ocorreu um erro ao gerar o relatório!')
    }
  }

  getGroupId () {
    const group = this.fullGroups.find(a => a.nome === this.selectedGrupo)

    if (group) return group.id

    return this.pagination.list && this.pagination.list.length ? this.pagination.list[0].grupoId : ''
  }

  getBranch (branchId, branchName) {
    if (branchName) return branchName

    const branch = this.filiais.find(branch => branch.id === branchId)

    return branch ? branch.nome : '-'
  }

  getBranchIdByName (branchName) {
    if (!branchName) return ''

    const branch = this.filiais.find(a => a.nome === branchName)

    return branch ? branch.id : ''
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

  loadPrograms () {
    if (this.fullPrograms.length === 0) {
      const params = {
        entity: 'program',
        page: 0,
        limit: 20
      }
      /* istanbul ignore next */
      this.cloudSearchQuery.getPage(params)
        .then((data) => {
          this.fullPrograms = data.data
        })
    }
  }

  defaultBranchSelected () {
    return !this.defaultFiliais.some(a => a.nome === this.filialSelected.nome)
  }

  getPercentage (progress) {
    if (not(is(Number, progress)) || progress < 0 || progress > 100) return '0%'

    const number = parseInt(progress)

    return number === progress ? `${progress}%` : `${parseInt(progress * 100) / 100}%`
  }
}

angular.module('eticca.admin').controller('admin.users', [
  '$http',
  '$resource',
  '$timeout',
  'cloudSearchQuery',
  'userService',
  'alertService',
  '$scope',
  'storageService',
  'authService',
  Users
])
