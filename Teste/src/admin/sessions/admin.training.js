class Training {
  constructor (scope, http, route, resource, timeout, cloudSearchQuery, alert, user, urlTraining, localStorage) {
    this.scope = scope
    this.http = http
    this.route = route
    this.resource = resource
    this.timeout = timeout
    this.cloudSearchQuery = cloudSearchQuery
    this.alert = alert
    this.user = user
    this.urlTraining = urlTraining
    this.localStorage = localStorage
    this.apiUrl = window.__API_URL
    this.appRef = 'ADMIN'
    this.removeObj = null
    this.fileModel = null
    this.updateVideo = false
    this.progress = {
      visible: false,
      keep: false,
      complete: 0
    }
    this.pagination = {
      search: '',
      grupoId: '',
      limit: 50,
      totalPages: 0,
      page: 0,
      list: [],
      range: [],
      orderBy: {
        key: 'videotraining_version',
        order: 'desc'
      },
      order: {
        predicate: 'videotraining_version',
        reverse: true
      },
      next: this.nextPage.bind(this),
      prev: this.previousPage.bind(this),
      goTo: this.goToPage.bind(this)
    }
    this.modalForm = {
      error: '',
      model: {
        id: '',
        nome: '',
        tipo: null,
        versao: '',
        descricao: '',
        copyContent: false // isAtivo: true,
      },
      validations: {},
      clearModalForm: this.clearModalForm.bind(this),
      open: this.openModalForm.bind(this),
      save: this.saveModalForm.bind(this)
    }
    this.versaoDetail = null
    this.lastSelectedVersaoId = null
    this.formatOptions = [
      { value: 'HTML', label: 'Html' },
      { value: 'MP4', label: 'Vídeo' }
    ]
    this.requestLinks = false
    this._onInit()
  }

  _onInit () {
    const params = {
      entity: 'usergroup',
      page: this.pagination.page,
      limit: this.pagination.limit
    }
    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then((data) => {
        this.selectedGrupo = JSON.parse(localStorage.getItem('userGroupId')) || ''
        this.dropGrupo = data.data
        this.update()
      })
      .catch(this.handleError.bind(this))

    angular.element(document).ready(() => {
      $('#modalDetail').on('hidden.bs.modal', () => {
        this.versaoDetail = null
        const pauseVideo = $('button.iconButton.pause')
        const iframe = $('iframe')
        if (pauseVideo.length) {
          pauseVideo.click()
        }
        if (iframe.length) {
          iframe.attr('src', '')
        }
      }).on('shown.bs.modal', () => {
        this.scope.$apply()
      }).on('hide.bs.modal', () => {
        this.timeout(() => {
          this.versaoDetail = null
        }, 200)
      })
      $('#modalForm').on('show.bs.modal', () => {
        this.resource(`${this.apiUrl}/versaotreinamento/sugestao?grupoId=` + this.selectedGrupo).get().$promise
          .then((data) => {
            this.modalForm.model.versao = data.versaoSugerida
            this.isPrimeiraVersao = data.primeiraVersao
          })
      })
    })
  }

  update () {
    this.pagination.grupoId = this.selectedGrupo
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
    const queryFields = [['videotraining_group_id', this.pagination.grupoId]]

    if (search) {
      queryFields.push(['videotraining_name', `"${search}"`])
    }

    const params = {
      entity: 'videotraining',
      page: this.pagination.page,
      limit: this.pagination.limit,
      query: queryFields,
      sort: `${this.pagination.orderBy.key} ${this.pagination.orderBy.order}`
    }

    this.pagination.list = []

    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then(this.successTraining.bind(this))
      .catch(this.errorTraining.bind(this))
  }

  successTraining (data) {
    this.pagination.list = data.data
    this.pagination.totalPages = data.totalPages
    this.pagination.page = data.page
    this.pagination.range = Array.apply(null, Array(data.totalPages)).map((_, i) => {
      return i
    })
  }

  errorTraining (error) {
    this.alert.error(error && error.data ? error.data.message : 'Erro ao tentar obter os treinamentos!')
  }

  async sendQuiz (fileModel) {
    if (!fileModel || $.isEmptyObject(fileModel)) {
      return
    }

    this.startProgress()

    try {
      const params = {
        type: this.versaoDetail.tipo,
        versionId: this.versaoDetail.id,
        data: Object.keys(fileModel).map(key => ({ filename: fileModel[key].name, size: fileModel[key].size, mimetype: fileModel[key].type }))
      }

      const signedUrls = await this.http.post(`${this.apiUrl}/versaotreinamento/upload/${params.versionId}`, params)
      if (!(Array.isArray(signedUrls.data) && signedUrls.data.length)) {
        return this.handleError({ data: { message: 'Não foi possível gerar a(s) url(s) para o(s) envio(s) do(s) arquivo(s)' } })
      }

      for (const [i, obj] of signedUrls.data.entries()) {
        const oldFile = fileModel[i]
        const blob = oldFile.slice(0, oldFile.size, obj.contentType)
        const file = new File([blob], obj.filename, { type: obj.contentType })

        try {
          await fetch(obj.url, {
            method: 'PUT',
            body: file
          })
        } catch (error) {
          console.error({ error })
          throw new Error('Houve um erro no envio do arquivo.')
        }
      }

      this.alert.success('Envio do(s) arquivo(s) concluído. QUIZ atualizado com sucesso!')
      this.completeProgress()

      if (this.versaoDetail.tipo === 'MP4') {
        this.resource(`${this.apiUrl}/versaotreinamento/finish/${this.versaoDetail.id}`, null, { update: { method: 'PUT' } }).update({}).$promise
          .catch(error => {
            console.error(error)
          })
      }
    } catch (error) {
      this.completeProgress()
      return this.handleError(error)
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
        $('#progressQuiz').css({ width: this.progress.complete.toString() + '%' })
        $('#progressQuiz2').css({ width: this.progress.complete.toString() + '%' })
        return this.keepProgress(n)
      }
    }, time)
  }

  completeProgress () {
    this.timeout(() => {
      this.progress.keep = false
      this.progress.complete = 100
      $('#progressQuiz').css({ width: this.progress.complete.toString() + '%' })
      $('#progressQuiz2').css({ width: this.progress.complete.toString() + '%' })
    }, 200)
  }

  clearModalForm () {
    for (const i in this.modalForm.model) {
      this.modalForm.model[i] = typeof this.modalForm.model[i] === 'boolean' ? false : ''
    }
    this.modalForm.error = ''
    this.modalForm.validations = {}
  }

  saveModalForm () {
    this.modalForm.error = ''
    if (!this.validationModalForm()) {
      return
    }
    return this.modalForm.model.id ? this.saveEdit() : this.createNew()
  }

  createNew () {
    const body = {}
    for (const i in this.modalForm.model) {
      if (this.modalForm.model[i]) {
        body[i] = this.modalForm.model[i]
      }
    }
    body.grupoId = this.selectedGrupo
    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/versaotreinamento`).save(body).$promise
      .then((data) => {
        this.pagination.list.unshift(data)
        this.alert.success('Versão "' + data.nome + '" criada com sucesso!')
        $('#modalForm').modal('hide')
      })
      .catch((error) => {
        this.modalForm.error = error.data ? error.data.message : 'Ocorreu um erro inesperado!'
      })
  }

  saveEdit () {
    const body = {}
    for (const i in this.modalForm.model) {
      if (angular.isDefined(this.modalForm.model[i])) {
        body[i] = this.modalForm.model[i]
      }
    }
    body.grupoId = this.selectedGrupo
    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/versaotreinamento/` + this.modalForm.model.id, null, { update: { method: 'PUT' } }).update(body).$promise
      .then((data) => {
        this.pagination.list.map((versao) => {
          if (versao.id === data.id) {
            versao.nome = data.nome
            versao.descricao = data.descricao
          }
          return versao
        })
        this.alert.success('Versão "' + this.modalForm.model.nome + '" atualizada com sucesso!')
        $('#modalForm').modal('hide')
      })
      .catch((error) => {
        this.modalForm.error = error.data ? error.data.message : 'Ocorreu um erro inesperado!'
      })
  }

  viewVersao (versaoDocumento) {
    this.versaoDetail = null
    this.validateUpdateVideo(false)

    $('#curso').attr('src', '')

    this.versaoDetail = angular.copy(versaoDocumento)
    this.lastSelectedVersaoId = this.versaoDetail.id

    this.http.get(`${this.apiUrl}/versaotreinamento/${this.versaoDetail.id}`)
      .then((result) => {
        this.versaoDetail = result.data

        if (this.versaoDetail.tipo === 'HTML' && this.versaoDetail.uploadStatus === 'COMPLETE') {
          const urlWithAccessToken = this.urlTraining.addAccessToken(this.versaoDetail)
          this.timeout(() => {
            $('#curso').attr('src', urlWithAccessToken)
          }, 200)
        }

        $('#modalDetail').modal('show')
      })
      .catch(error => {
        this.alert.error(error && error.data ? error.data.message : 'Erro ao abrir o treinamento')
      })
  }

  validateUpdateVideo (action) {
    this.updateVideo = action
    this.cleanModalVideo()
  }

  cleanModalVideo () {
    this.fileModel = null
    this.progress = {
      visible: false,
      keep: false,
      complete: 0
    }
  }

  getVideos () {
    // Clean the video data
    this.timeout(() => {
      $('#curso').attr('src', '')
    }, 200)

    this.requestLinks = true
    this.validateUpdateVideo(false)

    this.http.get(`${this.apiUrl}/versaotreinamento/videos/${this.versaoDetail.id}`)
      .then((result) => {
        this.pagination.list.some((elem) => {
          if (elem.id === this.versaoDetail.id) {
            elem.uploadStatus = result.data.uploadStatus
            this.versaoDetail.uploadStatus = result.data.uploadStatus
            this.versaoDetail.links = result.data.links || []

            if (result.data.type === 'HTML' && result.data.uploadStatus === 'COMPLETE') {
              const urlWithAccessToken = this.urlTraining.addAccessToken(this.versaoDetail)
              this.timeout(() => {
                $('#curso').attr('src', urlWithAccessToken)
              }, 200)
            }

            return true
          }

          return false
        })

        this.requestLinks = false
      },
      (error) => {
        this.requestLinks = false
        console.error(error)
        this.globalError = 'Ocorreu um erro inesperado!'
      })
  }

  openModalForm (doing) {
    $('#modalDetail').modal('hide')
    $('#versao').prop('disabled', false)

    this.clearModalForm()
    this.modalForm.doing = doing

    if (doing !== 'new') return

    this.resource(`${this.apiUrl}/versaotreinamento/sugestao?grupoId=` + this.selectedGrupo).get().$promise
      .then((data) => {
        this.modalForm.model.versao = data.versaoSugerida
        this.isPrimeiraVersao = data.primeiraVersao
      })

    $('#modalForm').modal('show')
  }

  handleError (error) {
    this.alert.error(error && error.message ? error.message : error.data && error.data.message ? error.data.message : 'Ocorreu um erro inesperado!')
  }

  validationModalForm () {
    let isValid = true
    this.modalForm.validations = {}
    if (!this.modalForm.model.nome) {
      isValid = false
      this.modalForm.validations.nome = 'Campo requerido!'
    }
    if (!this.modalForm.model.tipo) {
      isValid = false
      this.modalForm.validations.tipo = 'Campo requerido!'
    }
    if (!this.modalForm.model.versao) {
      isValid = false
      this.modalForm.validations.versao = 'Campo requerido!'
    }
    return isValid
  }

  getFormatLabel (value) {
    const option = this.formatOptions
      .find((opt) => {
        return opt.value === value
      })
    return option ? option.label : ''
  }

  remove (obj) {
    this.removeObj = obj
  }

  confirmRemove (resp) {
    if (resp) {
      this.resource(`${this.apiUrl}/versaotreinamento/` + this.removeObj.id).delete().$promise
        .then(() => {
          this.pagination.list.some((el, i) => {
            if (el.id === this.removeObj.id) {
              this.pagination.list.splice(i, 1)
              return true
            }

            return false
          })

          this.alert.success('Treinamento removido com sucesso.')
        })
        .catch(this.handleError.bind(this))
      return
    }
    return this.timeout(() => {
      this.removeObj = null
    }, 200)
  }
}

angular.module('eticca.admin').controller('admin.training', [
  '$scope',
  '$http',
  '$route',
  '$resource',
  '$timeout',
  'cloudSearchQuery',
  'alertService',
  'userService',
  'urlTraining',
  'storageService',
  Training
])
