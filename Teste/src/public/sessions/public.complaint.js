import { find, propEq } from 'ramda'

const readyFn = []
let denuncia
const filialDefault = {
  id: '',
  nome: 'Outras',
  informFilial: true
}

class ComplaintController {
  constructor ($scope, $timeout, $http, reCaptchaService, vcRecaptchaService, logoUrlService, cityService, storageService) {
    this.$scope = $scope
    this.$timeout = $timeout
    this.$http = $http
    this.reCaptchaService = reCaptchaService
    this.vcRecaptchaService = vcRecaptchaService
    this.logoUrlService = logoUrlService
    this.cityService = cityService
    this.apiUrl = window.__API_URL
    this.storageService = storageService
    this.srcLogo = this.logoUrlService.getUrlLogo()

    $scope.listaEstados = cityService.getStates()
    $scope.listaCidades = []
    $scope.filiais = []
    $scope.filialId = 1
    $scope.fato = 'false'
    $scope.denunciante = window.i18n('#denunciante')
    $scope.denuncia = window.i18n('#denuncia')
    $scope.denuncias = window.i18n('#denuncias')
    $scope.keyMalfeitor = window.i18n('#malfeitor')
    $scope.keyCEtica = window.keyCodigo('codigo_etica', true)
    $scope.identificar = 'false'
    $scope.opcao = 'Novo'
    $scope.listaExemplo = []
    $scope.denunciaData = {}
    $scope.recaptchaResponse = undefined
    $scope.denunciaDataTexto = ''
    $scope.denunciaDataFile = []
    $scope.files = []
    $scope.denunciaDataFiles = []
    $scope.reCaptchaSiteKey = reCaptchaService.siteKey
    $scope.changeFileInput = this.changeFileInput
    $scope.doubtSuggestionCompliment = false
    $scope.doubtSuggestionComplimentSearch = false
    Object.assign($scope, this)

    this.hideRecaptchaSearch = false
    this.hideForm = true

    const comStorage = this.storageService.factory('ETICCA.COMPLAINT');
    this.aba = comStorage.get('aba');
    comStorage.clear('ETICCA.COMPLAINT');
    this._onInit()
  }

  async _onInit () {
    try {
      const portalDisabled = 'O Portal foi desativado.'
      const portalNotConfigured = 'Portal não configurado, contate o administrador.'

      this.$http.get(`${this.apiUrl}/empresa`)
        .then((resp) => {
          const company = resp.data
          this.$scope.empresa = company.nome

          if (company) {
            if (company.active) {
              this.hideForm = false
              this.loadBranches()
            } else this.$scope.error = { message: portalDisabled }
          } else {
            this.$scope.error = { message: portalNotConfigured }
          }
        }, (error) => {
          this.$scope.error = { message: error.data.message === 'company not found' ? portalNotConfigured : 'Ocorreu um erro inesperado!' }
        })
    } catch (error) {
      console.error(error)
    }
    if(this.aba === 'search'){
      window.document.getElementById('search').click();
    }

  }

  loadBranches () {
    this.$http.get(`${this.apiUrl}/filial`)
      .then((resp2) => {
        this.$scope.filiais = (resp2.data || []).filter(a => a.tipo !== 'USER').sort((a, b) => a.nome > b.nome ? 1 : 0)
        this.$scope.filiais.push(filialDefault)
      }, () => {
        this.$scope.error = { message: 'Houve um erro ao tentar obter as filiais da empresa atual, por favor entre em contato com o suporte e tente novamente mais tarde.' }
      })

    readyFn.push(() => {
      $('#newInfoModal').on('show.bs.modal', () => {
        this.$scope.$apply(() => {
          this.reloadRecaptcha(this.$scope.rcNewInfoId)
        })
      })
    })
  }

  changeFileInput (from) {
    function clearInput () {
      window.document.getElementById(from === 0 ? 'documento' : 'tramiteDocumento').value = null
    }
    if (from === 0) { // criar denuncia
      this.$timeout(() => {
        this.$scope.$apply(() => {
          this.$scope.anexoError = this.$scope.files.some((f) => f.sizeError) ? 'O tamanho máximo de cada anexo é de 2mb.' : ''
          for (let i = 0; i < this.$scope.file.length; i += 1) {
            if (!this.$scope.files.some((f) => {
              return f.name === this.$scope.file[i].name && f.lastModified === this.$scope.file[i].lastModified && f.size === this.$scope.file[i].size
            })) {
              const file = this.$scope.file[i]
              const fileSizeMb = Math.floor(file.size / 1024 / 1024)
              if (fileSizeMb >= 2) {
                this.$scope.anexoError = 'O tamanho máximo de cada anexo é de 2mb.'
                file.sizeError = true
              }
              this.$scope.files.push(file)
            }
          }
          if (!this.$scope.anexoError) {
            this.$scope.anexoError = this.$scope.files.length > 5 ? 'O limite de 5 anexos foi atingido.' : ''
          }
          clearInput()
        })
      }, 250)
    }
    if (from === 1) { // adicionar informação
      this.$timeout(() => {
        this.$scope.$apply(() => {
          this.$scope.tramiteAnexoError = this.$scope.denunciaDataFiles.some((f) => f.sizeError) ? 'O tamanho máximo de cada anexo é de 2mb.' : ''
          this.$scope.denunciaDataFiles = this.$scope.denunciaDataFiles || []
          for (let i = 0; i < this.$scope.denunciaDataFile.length; i += 1) {
            if (!this.$scope.denunciaDataFiles.some((f) => {
              return f.name === this.$scope.denunciaDataFile[i].name && f.lastModified === this.$scope.denunciaDataFile[i].lastModified && f.size === this.$scope.denunciaDataFile[i].size
            })) {
              const file = this.$scope.denunciaDataFile[i]
              const fileSizeMb = Math.floor(file.size / 1024 / 1024)
              if (fileSizeMb >= 2) {
                this.$scope.tramiteAnexoError = 'O tamanho máximo de cada anexo é de 2mb.'
                file.sizeError = true
              }
              this.$scope.denunciaDataFiles.push(file)
            }
          }
          if (!this.$scope.tramiteAnexoError) {
            this.$scope.tramiteAnexoError = this.$scope.denunciaDataFiles.length > 5 ? 'O limite de 5 anexos foi atingido.' : ''
          }
          clearInput()
        })
      }, 250)
    }
  }

  removeFile (index, from) {
    if (from === 0) { // create denuncia
      this.$scope.files.splice(index, 1)
    } if (from === 1) { // tramite (nova informacao)
      this.$scope.denunciaDataFiles = this.$scope.denunciaDataFiles || []
      this.$scope.denunciaDataFiles.splice(index, 1)
    }
    this.$scope.changeFileInput(from)
  }

  fnHideRecaptchaSearch (hide) {
    this.hideRecaptchaSearch = hide
  }

  pesquisar () {
    if (!this.$scope.campoPesquisa) {
      this.$scope.listaExemplo = []
      this.$scope.denuncia = ''
      this.$scope.error = {
        message: 'O Campo de Pesquisa é obrigatório!'
      }

      $('html, body').animate({ scrollTop: 0 }, 'fast')

      return
    }

    this.$http.get(`${this.apiUrl}/denuncia/protocolo/${this.$scope.campoPesquisa}?recaptcha=${this.$scope.recaptchaResponse}`)
      .then((data) => {
        denuncia = data
        if (!denuncia.data) {
          this.$scope.denunciaData = {}
          this.$scope.listaExemplo = []
          this.$scope.error = { message: 'Não existe denúncia com esse Protocolo.' }
          this.fnHideRecaptchaSearch(false)
        } else {
          this.$scope.error = null
          this.$scope.denunciaData = denuncia.data
          this.$scope.denunciaData.date = new Date(denuncia.data.insertedAt).toLocaleDateString('pt-br', { month: 'short', year: 'numeric', day: 'numeric' })
          this.$scope.denunciaData.tipoRelatoText = this.getTipoRelato(denuncia.data.tipoRelato)
          this.$scope.doubtSuggestionComplimentSearch = (denuncia.data.tipoRelato || 0).toString() === '19'
          this.$scope.doubtSuggestionComplimentText = this.$scope.doubtSuggestionComplimentSearch ? 'Dúvidas, Sugestões ou Elogios' : `Informações do(a) ${this.$scope.denuncia}`
          this.$scope.listaExemplo = this.makeThreads(denuncia.data.threads, denuncia.data.tramitacao)
          this.fnHideRecaptchaSearch(true)
        }
      }, (error) => {
        if (error && error.data && error.data.message === 'Invalid recaptcha') {
          this.$scope.error = this.getRecaptchError()
        } else {
          this.$scope.error = { message: 'Não há ' + this.$scope.denuncia.toLowerCase() + ' com esse protocolo.' }
        }

        this.fnHideRecaptchaSearch(false)
        $('html, body').animate({ scrollTop: 0 }, 'fast')
      })
  }

  async downloadAnexo (protocol, threadId) {
    try {
      const fileUrl = `${this.apiUrl}/denuncia/thread/${protocol}/download/${threadId}`
      const res = await this.$http.get(fileUrl)

      return this.$http.get(res.data.url, { headers: { 'Content-Type': res.data.contentType }, responseType: 'arraybuffer' })
        .then(result => {
          this.openFile(result.data, res.data.filename, res.data.contentType)
        })
    } catch (error) {
      this.$scope.error = { message: error?.message ? error?.message : (error?.data && error.data.message ? error.data.message : 'Não foi possível acessar o arquivo') }
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
    this.$timeout(() => {
      document.body.removeChild(aLink)
    }, 200)
  }

  changeEstado () {
    this.$scope.listaCidades = []
    const estadoNome = this.$scope.estado
    const estado = find(propEq('nome', estadoNome), this.$scope.listaEstados)

    if (!estado || (typeof filial === 'object' && !estado.codigo)) {
      return
    }

    this.$scope.listaCidades = this.cityService.getCities(estado.codigo)

    return null
  }

  changeFilial () {
    this.$scope.filial = ''
  }

  changeComplaintType (tipoRelato) {
    this.$scope.doubtSuggestionCompliment = tipoRelato === 19 || tipoRelato === '19'
  }

  send () {
    const body = {}
    body.recaptcha = this.$scope.recaptchaResponse

    /** Empresa */
    if (!this.$scope.empresa) {
      this.$scope.error = { message: 'O Campo \'Para qual Empresa?\' é obrigatório!' }
      $('html, body').animate({ scrollTop: 0 }, 'fast')
      return
    }
    body.empresa = this.$scope.empresa ? this.$scope.empresa : ''

    /** Cidade */
    if (!this.$scope.cidade) {
      this.$scope.error = { message: 'O Campo \'Cidade\' é obrigatório!' }
      $('html, body').animate({ scrollTop: 0 }, 'fast')
      return
    }
    body.estado = this.$scope.estado ? this.$scope.estado : ''
    body.cidade = this.$scope.cidade ? this.$scope.cidade : ''

    /** Filial */
    if (typeof this.$scope.filialId === 'undefined') {
      this.$scope.error = { message: 'O Campo \'Filial\' é obrigatório!' }
      $('html, body').animate({ scrollTop: 0 }, 'fast')
      return
    }
    if (this.$scope.filialId !== '') {
      const filial = this.$scope.filiais.find((filial) => {
        return filial.id === this.$scope.filialId
      })
      this.$scope.filial = filial && filial.nome ? filial.nome : ''
    }
    if (this.$scope.filialId === '' && !this.$scope.filial) {
      this.$scope.error = { message: 'O Campo \'Informar filial\' é obrigatório!' }
      $('html, body').animate({ scrollTop: 0 }, 'fast')
      return
    }
    body.filial = this.$scope.filial ? this.$scope.filial : ''
    body.filialId = this.$scope.filialId ? this.$scope.filialId : ''

    /** Departamento */
    body.departamento = this.$scope.departamento ? this.$scope.departamento : ''

    /** Tipo de Relato */
    if (isNaN(parseInt(this.$scope.tipoRelato, 10))) {
      this.$scope.error = { message: 'O Campo \'Tipo de relato\' é obrigatório!' }
      $('html, body').animate({ scrollTop: 0 }, 'fast')
      return
    }
    body.tipoRelato = this.$scope.tipoRelato

    /** Identificação */
    if (this.$scope.identificar === 'true') {
      if (!this.$scope.nome) {
        this.$scope.error = { message: 'O Campo \'Nome\' é obrigatório!' }
        $('html, body').animate({ scrollTop: 0 }, 'fast')
        return
      }
    }
    body.identificar = this.$scope.identificar === 'true'
    body.nome = this.$scope.nome ? this.$scope.nome : ''
    if (this.$scope.email) {
      body.email = this.$scope.email ? this.$scope.email : ''
    }
    if (this.$scope.telefone) {
      body.telefone = this.$scope.telefone ? this.$scope.telefone : ''
    }

    /** Relação com o fato */
    if (this.$scope.fato === 'true') {
      if (!this.$scope.fatoRelatado) {
        this.$scope.error = { message: 'É obrigatório descrever os fatos relatados!' }
        $('html, body').animate({ scrollTop: 0 }, 'fast')
        return
      }
    }
    body.fato = this.$scope.fato === 'true'
    body.fatoRelatado = this.$scope.fatoRelatado ? this.$scope.fatoRelatado : ''
    if (!this.$scope.problema) {
      this.$scope.error = { message: 'O Campo \'Que problema gostaria de relatar?\' é obrigatório!' }
      $('html, body').animate({ scrollTop: 0 }, 'fast')
      return
    }

    /** Problema */
    body.problema = this.$scope.problema ? this.$scope.problema : ''
    if (this.$scope.testemunha) {
      body.testemunha = this.$scope.testemunha ? this.$scope.testemunha : ''
    }

    /** Agente envolvido */
    if (this.$scope.malfeitor) {
      body.malfeitor = this.$scope.malfeitor ? this.$scope.malfeitor : ''
    }

    /** Evidência do relato */
    if (this.$scope.evidencia) {
      body.evidencia = this.$scope.evidencia ? this.$scope.evidencia : ''
    }

    /** Informação relevante */
    if (this.$scope.informacaoRelevante) {
      body.informacaoRelevante = this.$scope.informacaoRelevante ? this.$scope.informacaoRelevante : ''
    }

    /** Anexos */
    const files = this.$scope.files
    body.files = Object.keys(files).map(key => ({
      filename: files[key].name,
      size: files[key].size,
      mimetype: files[key].type
    }))

    /** Enviando relato */
    this.$http.post(`${this.apiUrl}/denuncia`, JSON.stringify(body), {
      transformRequest: angular.identity,
      headers: { 'Content-Type': 'application/json' }
    })
      .then(async (data) => {
        denuncia = data
        this.$scope.success = denuncia.data
        this.$scope.success.message = 'A sua denúncia foi registrada com sucesso e será encaminhada ao setor competente para devidos encaminhamentos.'

        $('html, body').animate({ scrollTop: 0 }, 'fast')

        if (Array.isArray(data.data.files) && data.data.files.length) {
          for (const [i, obj] of data.data.files.entries()) {
            const oldFile = files[i]
            const blob = oldFile.slice(0, oldFile.size, obj.contentType)
            const file = new File([blob], obj.filename, { type: obj.contentType })

            await fetch(obj.url, {
              method: 'PUT',
              body: file
            })
          }

          await this.$http.post(`${this.apiUrl}/denuncia/finishupload/${denuncia.data.id}`, {})
        }

        this.$scope.file = []
        this.$scope.files = []
      })
      .catch((error) => {
        error = error.data || error
        this.$scope.success = null

        if (error) {
          if (error.data && error.data.message === 'Invalid recaptcha') {
            this.$scope.error = this.getRecaptchError()
          } else {
            this.$scope.error = error
          }
        }

        setTimeout(() => {
          this.$scope.$apply()
        }, 1000)

        $('html, body').animate({ scrollTop: 0 }, 'fast')
      })
  };

  saveTramite () {
    const body = {}
    const files = this.$scope.denunciaDataFiles

    body.recaptcha = this.$scope.recaptchaResponse
    body.texto = this.$scope.denunciaDataTexto

    body.files = Object.keys(files).map(key => ({
      filename: files[key].name,
      size: files[key].size,
      mimetype: files[key].type
    }))

    this.$http.post(`${this.apiUrl}/denuncia/tramitacao/${this.$scope.denunciaData.protocolo}`, JSON.stringify(body), {
      transformRequest: angular.identity,
      headers: { 'Content-Type': 'application/json' }
    })
      .then(async (denuncia) => {
        $('#newInfoModal').modal('hide')

        this.$scope.denunciaDataTexto = ''
        this.$scope.denunciaDataFile = []
        this.$scope.denunciaDataFiles = []
        this.$scope.denunciaData = denuncia.data
        this.$scope.denunciaData.date = new Date(denuncia.data.insertedAt).toLocaleDateString('pt-br', { month: 'short', year: 'numeric', day: 'numeric' })
        this.$scope.listaExemplo = this.makeThreads(denuncia.data.threads, denuncia.data.tramitacao)
        this.$scope.tramiteError = ''
        this.$scope.tramiteSuccess = 'A nova informação foi adicionada à denúncia com sucesso!'

        $('html, body').animate({ scrollTop: $(document).height() }, 'fast')

        if (Array.isArray(denuncia.data.files) && denuncia.data.files.length) {
          for (const [i, obj] of denuncia.data.files.entries()) {
            const oldFile = files[i]
            const blob = oldFile.slice(0, oldFile.size, obj.contentType)
            const file = new File([blob], obj.filename, { type: obj.contentType })

            await fetch(obj.url, {
              method: 'PUT',
              body: file
            })
          }

          const finishData = {
            proceedingId: denuncia.data.tramitacao[denuncia.data.tramitacao.length - 1].id
          }
          await this.$http.post(`${this.apiUrl}/denuncia/tramitacao/finishupload/${denuncia.data.id}`, finishData)
        }
      })
      .catch((error) => {
        this.$scope.tramiteSuccess = ''

        if (error && error.data && error.data.message === 'Invalid recaptcha') {
          this.$scope.tramiteError = this.getRecaptchError().message
          return
        }

        this.$scope.tramiteError = 'Houve um erro inesperado ao tentar adicionar sua informação. Tente novamente mais tarde!'
      })
  }

  setRcSearchId (widgetId) {
    this.$scope.rcSearchId = widgetId
  }

  setRcNewInfoId (widgetId) {
    this.$scope.rcNewInfoId = widgetId
  }

  setRcNewDenuncia (widgetId) {
    this.$scope.rcNewDenuncia = widgetId
  }

  reloadRecaptcha (widgetId) {
    this.vcRecaptchaService.reload(widgetId)
  }

  getTipoRelato (n) {
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

  makeThreads (threads, tramitacao) {
    threads = threads || []
    tramitacao = (tramitacao || []).map((t) => {
      t.isTramitacao = true
      return t
    })
    return [].concat(threads).concat(tramitacao).sort((a, b) => {
      return a.insertedAt < b.insertedAt ? -1 : 1
    })
  }

  recapchaExpiration () {
    this.$scope.recaptchaResponse = undefined
  }

  getRecaptchError () {
    return { message: 'Ocorreu um erro no recaptcha, por favor refaça a verificação "Não sou um robô".' }
  }
}

angular.module('eticca.public').controller('public.complaint', [
  '$scope',
  '$timeout',
  '$http',
  'reCaptchaService',
  'vcRecaptchaService',
  'logoUrlService',
  'cityService',
  'storageService',
  ComplaintController
])

jQuery(() => {
  // $('#telefone').mask('(00) ? 0000-0000', { translation: { '?': { pattern: /[9]/, optional: true } }, clearIfNotMatch: true })
  readyFn.forEach((fn) => {
    return fn && (typeof fn === 'function') ? fn() : 0
  })
})
