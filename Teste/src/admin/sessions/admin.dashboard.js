import { concat, eqBy, groupBy, isEmpty, prop, unionWith } from 'ramda'

class Dashboard {
  constructor (timeout, resource, alert, user, localStorage, cloudSearchQuery, authService) {
    this.timeout = timeout
    this.resource = resource
    this.alert = alert
    this.user = user
    this.localStorage = localStorage
    this.cloudSearchQuery = cloudSearchQuery
    this.auth = authService
    this.apiUrl = window.__API_URL
    this.appRef = 'ADMIN'
    this.isMobile = this.auth.isMobile()
    this.mobileStyle = this.isMobile ? { 'padding-top': '60px' } : {}

    this.keyDenuncia = window.i18n('#denuncia')
    this.keyDenuncias = window.i18n('#denuncias')

    this.denuncias = {}
    this.colaborador = {}

    /* Grupos */
    this.dropGrupos = []
    this.selectedGroup = null

    /* Filiais e Seções */
    this.dropBranches = []
    this.defaultBranches = [
      {
        id: '',
        nome: 'Todas as filiais',
        todas: true
      }
    ]
    this.selectedBranch = this.defaultBranches[0]

    /* Programas */
    this.dropProgramas = []
    this.selectedProgram = null

    /* Gráficos */
    this.riscoTotal = {
      datapoints: [],
      datacolumns: [
        {
          id: 'riscoTotal',
          type: 'gauge',
          name: 'Percentual de Risco'
        }
      ]
    }
    this.colaboradoresAtivos = {
      datapoints: [],
      datacolumns: [
        {
          id: 'colaboradoresAtivosData1',
          type: 'pie',
          name: 'Aguardando Cadastro'
        },
        {
          id: 'colaboradoresAtivosData3',
          type: 'pie',
          name: 'Inativo'
        },
        {
          id: 'colaboradoresAtivosData2',
          type: 'pie',
          name: 'Ativo'
        }
      ]
    }
    this.resultadoProgramas = {
      datapoints: [],
      datacolumns: [
        {
          id: 'resultadoProgramasData1',
          type: 'pie',
          name: 'Concluído'
        },
        {
          id: 'resultadoProgramasData2',
          type: 'pie',
          name: 'Incompleto'
        }
      ]
    }
    this.notasPrograma = {
      datapoints: [],
      datacolumns: [
        {
          id: 'notasProgramaData1',
          type: 'donut',
          name: '0 a 5,9'
        },
        {
          id: 'notasProgramaData2',
          type: 'donut',
          name: '6 a 8,9'
        },
        {
          id: 'notasProgramaData3',
          type: 'donut',
          name: '9 a 10'
        }
      ]
    }

    this.calculaCor = () => {
      if (this.riscoTotal.valor < 34) {
        return '#00a65a'
      }
      if (this.riscoTotal.valor > 33 && this.riscoTotal.valor < 50) {
        return '#f39c12'
      }

      return '#f56954'
    }

    this._onInit()
  }

  cleanSectionInfo () {
    /** Dados para seção */
    this.secaoHabilitada = false
    this.secaoChaveNome = 'Seção'
  }

  getSectionInfo () {
    /** 1 - Buscando dados da company */
    this.cleanSectionInfo()
    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/empresa`, {}, { query: { method: 'GET' } }).query({}).$promise
      .then((data) => {
        this.secaoHabilitada = data && data.secaoHabilitada ? data.secaoHabilitada : false
      })
      .catch(this.cleanSectionInfo.bind(this))
  }

  async _onInit () {
    try {
      const user = await this.user.$promise

      /* Get section informations */
      this.getSectionInfo()

      /* Buscando os grupos e programas */
      const userProgressSearchParams = {
        entity: 'userprogress',
        type: 'facet',
        facets: [
          ['userprogress_group_name', 'grupos'],
          ['userprogress_branch_name', 'filiais'],
          ['userprogress_section_name', 'secoes']
        ]
      }
      const userProgressResult = await this.cloudSearchQuery.getPage(userProgressSearchParams)
      const userGroups = userProgressResult.facets?.grupos?.length ? userProgressResult.facets.grupos : []

      /* Aplicando união entre filiais e seções. */
      this.dropBranches = [...this.defaultBranches, ...unionWith(
        eqBy(prop('nome')),
        userProgressResult.facets?.filiais?.length ? userProgressResult.facets.filiais : [],
        userProgressResult.facets?.secoes?.length ? userProgressResult.facets.secoes : []
      ).sort((a, b) => a.nome > b.nome ? 1 : -1)]

      /* Buscando as filiais entre os preregisters */
      const preRegisterParams = {
        entity: 'preregister',
        type: 'facet',
        query: [],
        facets: [['preregister_group_name', 'groups']]
      }
      const preRegisterResult = await this.cloudSearchQuery.getPage(preRegisterParams)
      const preRegisterGroups = preRegisterResult.facets?.groups?.length ? preRegisterResult.facets.groups : []

      /* Preenchendo a lista de grupos */
      this.dropGrupos = unionWith(eqBy(prop('nome')), userGroups, preRegisterGroups)

      /* Buscando os dados do grupo do usuário */
      const userGroupSearchParams = {
        entity: 'usergroup',
        page: 0,
        limit: 1,
        query: [['global_id', user.grupoId]],
        sort: 'created_at asc'
      }
      const userGroupResult = await this.cloudSearchQuery.getPage(userGroupSearchParams)

      this.selectedGroup = userGroupResult.data && userGroupResult.data.length ? userGroupResult.data[0].nome : ''

      localStorage.setItem('userGroupId', JSON.stringify(user.grupoId))
      localStorage.setItem('userGroupName', JSON.stringify(this.selectedGroup))

      /* Buscando as denúncias */
      const complaintSearshParams = {
        entity: 'complaint',
        type: 'facet',
        facets: [['complaint_status', 'denuncias']]
      }
      const complaintResult = await this.cloudSearchQuery.getPage(complaintSearshParams)
      const aberto = complaintResult.facets.denuncias.find(a => a.nome === 'aberto')
      const emprogresso = complaintResult.facets.denuncias.find(a => a.nome === 'em_progresso')
      const fechado = complaintResult.facets.denuncias.find(a => a.nome === 'fechado')

      this.denuncias = {
        total: complaintResult.count,
        aberto: aberto ? aberto.count : 0,
        em_progresso: emprogresso ? emprogresso.count : 0,
        fechado: fechado ? fechado.count : 0
      }
      this.denuncias.riscoDenunciaNaoTradada = this.denuncias.total ? this.denuncias.aberto / this.denuncias.total * 100 : 0

      this.update()
    } catch (error) {
      console.log(error)
      this.alert.error('Erro ao buscar os dados para montagem da Dashboard')
    }
  }

  async update () {
    try {
      /* Buscando os programas */
      const userProgressSearchParams = {
        entity: 'userprogress',
        type: 'facet',
        query: [['userprogress_group_name', `"${this.selectedGroup}"`]],
        facets: [['userprogress_program_version', 'programas']]
      }
      const userProgressResult = await this.cloudSearchQuery.getPage(userProgressSearchParams)
      this.dropProgramas = userProgressResult.facets.programas.length ? userProgressResult.facets.programas.sort((a, b) => a.nome > b.nome ? 1 : -1) : []
      /* Buscando o programa ativo */
      const params = {
        entity: 'program',
        page: 0,
        limit: 1,
        query: [['program_group_name', `"${this.selectedGroup}"`]],
        sort: 'created_at asc'
      }
      const programResult = await this.cloudSearchQuery.getPage(params)
      const activeProgram = programResult.data && programResult.data.length ? programResult.data[0] : null
      const program = activeProgram && this.dropProgramas.length ? this.dropProgramas.find(a => a.nome === activeProgram.versao) : null

      /* Selecionando a versão do programa no dropdown */
      this.selectedProgram = program ? program.nome : this.dropProgramas && this.dropProgramas.length ? this.dropProgramas[0].nome : ''

      /* Buscando os preregisters */
      const preRegisterSearshParams = {
        entity: 'preregister',
        type: 'facet',
        query: [['preregister_group_name', `"${this.selectedGroup}"`], ['(enabled', `${1} OR`], ['enabled', `${0})`]],
        facets: [['enabled', 'preRegisters']]
      }
      this.preRegisterResult = await this.cloudSearchQuery.getPage(preRegisterSearshParams)

      this.refreshDashboard()
    } catch (error) {
      console.log(error)
      this.alert.error('Erro ao buscar os dados para montagem da Dashboard')
    }
  }

  cleanGraphicsData () {
    this.riscoTotal.datapoints = []
    this.colaboradoresAtivos.datapoints = []
    this.resultadoProgramas.datapoints = []
    this.notasPrograma.datapoints = []
  }

  getBranchFilter () {
    if (this.selectedBranch && this.selectedBranch.nome !== this.defaultBranches[0].nome) {
      return [['(userprogress_branch_name', `"${this.selectedBranch.nome}" OR`], ['userprogress_section_name', `"${this.selectedBranch.nome}")`]]
    }

    return []
  }

  async refreshDashboard () {
    try {
      const branchFilter = this.getBranchFilter()

      /* Buscando os userprogresses ativos e inativos */
      const userProgressSearchAllParams = {
        entity: 'userprogress',
        type: 'facet',
        query: [['userprogress_group_name', `"${this.selectedGroup}"`], ['userprogress_program_version', `"${this.selectedProgram}"`], ['userprogress_user_remove_statistics', 0], ['(enabled', `${1} OR`], ['enabled', `${0})`], ...branchFilter],
        facets: [['enabled', 'ativos']]
      }
      const userProgressWithAllResult = await this.cloudSearchQuery.getPage(userProgressSearchAllParams)

      const ativo = userProgressWithAllResult.facets.ativos.find(a => a.nome === '1')
      const inativo = userProgressWithAllResult.facets.ativos.find(a => a.nome === '0')

      /* Buscando os userprogresses */
      const userProgressResult = await this.getUserProgresses(this.selectedGroup, this.selectedProgram)

      /* Grouping users */
      const resultProgresses = groupBy(user => user.progresso === 100 ? 'concluiu' : 'naoConcluiu', userProgressResult)

      /* Passed and unpassed users */
      const aprovado = (resultProgresses.concluiu || [])
      const reprovado = (resultProgresses.naoConcluiu || [])

      /* Grades' users */
      const riscoAlto = reprovado.filter(a => a.nota < 60)
      const riscoMedio = reprovado.filter(a => a.nota >= 60 && a.nota < 90)
      const riscoBaixo = [...aprovado, ...reprovado].filter(a => a.nota >= 90).length

      const programDashboardUser = {
        total: userProgressWithAllResult.count,
        preCadastrados: this.preRegisterResult.count,
        ativo: ativo ? ativo.count : 0,
        naoAtivo: inativo ? inativo.count : 0
      }

      /* Counting user data in the program training */
      const naoConcluiuPrograma = resultProgresses.naoConcluiu ? resultProgresses.naoConcluiu.length : 0
      const concluiuPrograma = resultProgresses.concluiu ? resultProgresses.concluiu.length : 0
      const programDashboardUserCounted = {
        mediaNotas: aprovado && aprovado.length ? aprovado.reduce((acc, a) => acc + a.nota, 0) / aprovado.length : 0,
        concluiuPrograma,
        naoConcluiuPrograma: concluiuPrograma === 0 && naoConcluiuPrograma === 0 ? 1 : naoConcluiuPrograma,
        naoAtingiuNota: [...riscoAlto, ...riscoMedio].filter(a => a.nota < 80).length,
        risco: {
          baixo: riscoBaixo,
          medio: riscoMedio ? riscoMedio.length : 0,
          alto: riscoAlto ? riscoAlto.length : 0
        }
      }

      const totalUsers = programDashboardUser.ativo + programDashboardUser.naoAtivo + programDashboardUser.preCadastrados
      const totalProgramConcluded = programDashboardUserCounted.concluiuPrograma + programDashboardUserCounted.naoConcluiuPrograma
      const totalRiskData = programDashboardUser.ativo
        ? {
            alto: programDashboardUserCounted.risco.alto * 100 / programDashboardUser.ativo,
            medio: programDashboardUserCounted.risco.medio * 100 / programDashboardUser.ativo,
            baixo: programDashboardUserCounted.risco.baixo * 100 / programDashboardUser.ativo
          }
        : { alto: 100, medio: 0, baixo: 0 }

      this.colaborador = {
        ...programDashboardUser,
        ...programDashboardUserCounted,
        mediaNotas: programDashboardUserCounted.mediaNotas,
        percentualPreCadastrados: totalUsers ? programDashboardUser.preCadastrados * 100 / totalUsers : 100,
        percentualConclusaoPrograma: totalProgramConcluded ? programDashboardUserCounted.naoConcluiuPrograma * 100 / totalProgramConcluded : 0,
        risco: {
          baixo: totalRiskData.baixo,
          medio: totalRiskData.medio,
          alto: totalRiskData.baixo === 0 && totalRiskData.medio === 0 ? 100 : totalRiskData.alto
        }
      }
      this.colaborador.riscoColaboradoresAtivos = this.colaborador.percentualPreCadastrados
      this.colaborador.riscoConclusaoPrograma = this.colaborador.percentualConclusaoPrograma

      this.cleanGraphicsData()

      this.timeout(() => {
        const risco = Math.round((this.denuncias.riscoDenunciaNaoTradada + this.colaborador.riscoConclusaoPrograma + this.colaborador.riscoColaboradoresAtivos) / 3 * 100) / 100
        this.riscoTotal.valor = risco
        this.riscoTotal.datapoints = [{ riscoTotal: risco }]

        this.colaboradoresAtivos.datapoints = [
          { colaboradoresAtivosData1: this.colaborador.preCadastrados === 0 && this.colaborador.ativo === 0 && this.colaborador.naoAtivo === 0 ? 1 : this.colaborador.preCadastrados },
          { colaboradoresAtivosData2: this.colaborador.ativo },
          { colaboradoresAtivosData3: this.colaborador.naoAtivo }
        ]
        this.resultadoProgramas.datapoints = [
          { resultadoProgramasData1: this.colaborador.concluiuPrograma },
          { resultadoProgramasData2: this.colaborador.naoConcluiuPrograma }
        ]

        this.notasPrograma.datapoints = [
          { notasProgramaData1: this.colaborador.risco.alto },
          { notasProgramaData2: this.colaborador.risco.medio },
          { notasProgramaData3: this.colaborador.risco.baixo }
        ]
      }, 500)
    } catch (error) {
      this.handleError(error)
    }
  }

  getUserProgresses (groupName, programVersion) {
    const branchFilter = this.getBranchFilter()

    const applyPagination = async (page) => {
      /* Buscando os userprogresses */
      const userProgressSearchParams = {
        entity: 'userprogress',
        page,
        limit: 300,
        query: [['userprogress_group_name', `"${groupName}"`], ['userprogress_program_version', `"${programVersion}"`], ['userprogress_user_remove_statistics', 0], ['enabled', '1'], ...branchFilter]
      }
      const userProgressResult = await this.cloudSearchQuery.getPage(userProgressSearchParams)

      if (!userProgressResult.data || isEmpty(userProgressResult.data)) return userProgressResult.data || []

      const nextPage = await applyPagination(page + 1)
      return concat(userProgressResult.data, nextPage)
    }

    return applyPagination(0)
  }

  handleError (error) {
    let message = 'Ocorreu um erro inesperado!'
    if (error && error.message) {
      message = error.message
    }
    return this.alert.error('Erro!', message)
  }
}

angular.module('eticca.admin').controller('admin.dashboard', [
  '$timeout',
  '$resource',
  'alertService',
  'userService',
  'storageService',
  'cloudSearchQuery',
  'authService',
  Dashboard
])
