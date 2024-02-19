class Repository {
  constructor(http, location, resource, timeout, cloudSearchQuery, alert, $scope) {
    this.http = http
    this.scope = $scope
    this.location = location
    this.resource = resource
    this.timeout = timeout
    this.cloudSearchQuery = cloudSearchQuery
    this.alert = alert
    this.apiUrl = window.__API_URL
    this.appRef = 'ADMIN'
    this.removeObj = null
    this.nomePasta = null
    this.progress = {
      visible: false,
      keep: false,
      complete: 0
    }
    this.crumbPastas = []
    this.pagination = {
      search: '',
      searchAll: false,
      showWithFather: false,
      fatherId: '',
      limit: 10,
      page: 0,
      totalPages: 0,
      list: [],
      range: [],
      orderBy: {
        key: 'filestorage_name',
        order: 'asc'
      },
      order: {
        predicate: 'filestorage_name',
        reverse: false
      },
      goTo: this.goToPage.bind(this)
    }
    this.uploadInput = {
      multiple: true,
      model: null,
      params: {
        id: 'files',
        name: 'documento',
        showPreview: true,
        extensions: [
          'pdf',
          'txt',
          'doc',
          'docx',
          'xls',
          'xlsx',
          'ppt',
          'pptx',
          'jpg',
          'png',
          'gif',
          'jpeg',
          'tiff',
          'mp3',
          'wav',
          'wma',
          '3gp',
          'avi',
          'mp4',
          'flv',
          'mpeg',
          'wmv'
        ],
        upload: this.upload.bind(this)
      }
    }
    this.editObj = {}
    this._onInit()
  }

  _onInit() {
    this.goToPage(0, false, true)
  }

  orderBy(key) {
    if (this.pagination.order.predicate === key) {
      this.pagination.order.reverse = !this.pagination.order.reverse
    } else {
      this.pagination.orderBy = {
        key: key,
        order: this.pagination.order.reverse ? 'desc' : 'asc'
      }
    }
    this.goToPage(0, false, true)
  }

  goToPage(page, first, ordering) {
    if (this.pagination.page === page && !first && !ordering) {
      return
    }

    this.pagination.page = page

    return this.applyPagination()
  }

  pesquisar() {
    this.pagination.page = 0
    this.pagination.showWithFather = this.pagination.searchAll

    return this.applyPagination()
  }

  previousPage() {
    if (this.pagination.page === 0) {
      return
    }

    this.pagination.page -= 1

    return this.applyPagination()
  }

  nextPage() {
    if (this.pagination.page === this.pagination.totalPages - 1) {
      return
    }

    this.pagination.page += 1

    return this.applyPagination()
  }

  applyPagination() {
    const queryFields = []
    const search = this.pagination.search ? (this.pagination.search.indexOf('*') >= 0 ? '' : `*${this.pagination.search}*`) : ''

    if (search) {
      queryFields.push(['filestorage_name', `"${search}"`])

      if (!this.pagination.searchAll) {
        if (this.crumbPastas && this.crumbPastas.length > 0) {
          queryFields.push(['filestorage_father_id', this.crumbPastas[this.crumbPastas.length - 1].id])
        } else {
          queryFields.push(['NOT filestorage_father_id', '*'])
        }
      }
    } else {
      if (this.crumbPastas && this.crumbPastas.length > 0) {
        queryFields.push(['filestorage_father_id', this.crumbPastas[this.crumbPastas.length - 1].id])
      } else {
        queryFields.push(['NOT filestorage_father_id', '*'])
      }
    }

    const params = {
      entity: 'filestorage',
      page: this.pagination.page,
      limit: this.pagination.limit,
      query: queryFields,
      sort: `${this.pagination.orderBy.key} ${this.pagination.orderBy.order}`
    }

    this.pagination.list = []

    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then(this.succesRepository.bind(this))
      .catch(this.errorRepository.bind(this))
  }

  getPathName(file) {
    if (!this.pagination.search) return file.name

    return this.pagination.showWithFather ? (!file.fatherName ? './' + file.name : '.../' + file.fatherName + '/' + file.name) : file.name
  }

  succesRepository(data) {
    this.pagination.list = data.data.map(item => ({ ...item, size: item.size || 0 }))
    this.pagination.totalPages = data.totalPages
    this.pagination.page = data.page
    this.pagination.range = Array.apply(null, Array(data.totalPages)).map((_, i) => i)
  }

  errorRepository(error) {
    this.alert.error(error?.data?.message || 'Erro ao tentar obter os Grupos de Usuários')
  }

  handleError(error) {
    this.alert.error(error?.data?.message || 'Ocorreu um erro inesperado! Tente novamente mais tarde.')
  }

  async upload(model, complete) {
    this.startProgress()
    const params = {
      father: this.crumbPastas.length ? this.crumbPastas[this.crumbPastas.length - 1].id : '',
      data: Object.keys(this.uploadInput.model).map(key => ({ filename: this.uploadInput.model[key].name, size: this.uploadInput.model[key].size, mimetype: this.uploadInput.model[key].type }))
    }

    try {
      const signedUrls = await this.http.post(`${this.apiUrl}/docadministrativo/upload`, params)
      if (!(Array.isArray(signedUrls.data) && signedUrls.data.length)) {
        return this.handleError({ data: { message: 'Não foi possível gerar a(s) url(s) para o(s) envio(s) do(s) arquivo(s)' } })
      }

      for (const [i, obj] of signedUrls.data.entries()) {
        // this.uploadInput.model[i].name = obj.filename
        const oldFile = this.uploadInput.model[i]
        const blob = oldFile.slice(0, oldFile.size, obj.contentType)
        const file = new File([blob], obj.filename, { type: obj.contentType })

        await fetch(obj.url, {
          method: 'PUT',
          body: file
        })
      }

      this.completeProgress()
      this.applyPagination()
      complete()
    } catch (error) {
      console.log({ error })
      this.completeProgress()
      return this.handleError(error)
    }
  }

  async open(e, file) {
    const idDel = 'del_' + file.id
    const idEdit = 'edit_' + file.id
    const idSave = 'save_' + file.id
    const idCancel = 'cancel_' + file.id
    if (this.editObj.id) {
      return
    }
    if (e.target.getAttribute('id') === idSave || e.target.parentElement.getAttribute('id') === idSave || e.target.getAttribute('id') === idCancel || e.target.parentElement.getAttribute('id') === idCancel) {
      return
    }
    if (e.target.getAttribute('id') === idDel || e.target.parentElement.getAttribute('id') === idDel) {
      // Clicou no botão de deletar e não para abrir o arquivo
      return
    }
    if (e.target.getAttribute('id') === idEdit || e.target.parentElement.getAttribute('id') === idEdit) {
      // Clicou no botão de editar e não para abrir o arquivo
      return
    }
    switch (file.type) {
      case 'FOLDER':
        this.openFolder(file)
        break
      default:
        this.visualise(file)
      //this.downloadFile(file)
    }
  }

  openFolder(folder) {
    const copyFolder = angular.copy(folder)
    copyFolder.active = true
    if (this.crumbPastas.length) {
      this.crumbPastas[this.crumbPastas.length - 1].active = false
    }
    this.crumbPastas.push(copyFolder)
    this.pagination.search = ''
    this.pagination.page = 0
    this.applyPagination()
  }

  goToFolder(folder) {
    if (!folder) {
      this.crumbPastas = []
    }

    this.crumbPastas.some((el, i) => {
      if (el.id === folder.id) {
        this.crumbPastas.splice(i === 0 ? 1 : i === this.crumbPastas.length - 1 ? i : i + 1)
        el.active = true
        return true
      }
      return false
    })

    this.pagination.search = ''
    this.pagination.page = 0
    this.applyPagination()
  }

  async downloadFile(file) {
    try {
      const res = await this.http.get(`${this.apiUrl}/docadministrativo/download/${file.id}`)

      return this.http.get(res.data.url, { headers: { 'Content-Type': res.data.contentType }, responseType: 'arraybuffer' })
        .then(result => {
          const aLink = document.createElement('a')
          document.body.appendChild(aLink)

          const file = new Blob([result.data], { type: res.data.contentType })
          const fileURL = window.URL.createObjectURL(file)

          aLink.href = fileURL
          aLink.download = res.data.filename
          aLink.click()
          this.timeout(() => {
            document.body.removeChild(aLink)
          }, 2000)
        })
    } catch (error) {
      return this.handleError({ data: { message: 'Não foi possível acessar o arquivo' } })
    }
  }

  startProgress() {
    this.progress.keep = this.progress.visible = true
    this.progress.complete = 0
    return this.keepProgress(5)
  }

  keepProgress(n) {
    let time = 200
    return this.timeout(() => {
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
        $('#progressUpload').css({ width: this.progress.complete.toString() + '%' })
        return this.keepProgress(n)
      }
    }, time)
  }

  completeProgress() {
    const progress = $('#progressUpload')
    this.progress.keep = false
    this.progress.complete = 100
    progress.css({ width: this.progress.complete.toString() + '%' })
    this.timeout(() => {
      progress.fadeOut('slow', () => {
        progress.fadeIn()
      })
      this.timeout(() => {
        this.progress = {
          visible: false,
          keep: false,
          complete: 0
        }
        progress.css({ width: '0%' })
      }, 500)
    }, 1000)
  }

  novaPasta() {
    if (this.nomePasta) {
      const params = {
        name: this.nomePasta,
        type: 'FOLDER',
        father: this.crumbPastas.length ? this.crumbPastas[this.crumbPastas.length - 1].id : ''
      }

      this.resource(`${this.apiUrl}/docadministrativo`).save(params).$promise
        .then((data) => {
          this.nomePasta = null
          this.pagination.list.push(data)
          this.alert.success(`Pasta '${data.name}' adicionada com sucesso!`)
        })
        .catch(this.handleError.bind(this))
    }
  }

  /**
   * Renomear arquivo ou pasta passado no parâmetro
   * @param {File|Folder} - Arquivo ou pasta a ser renomeado
   * @return {void}
   */
  rename(obj) {
    this.resource(`${this.apiUrl}/docadministrativo/${obj.id}`, {}, { update: { method: 'PUT' } }).update(obj).$promise
      .then((data) => {
        this.pagination.list.map(item => {
          if (item.id === data.id) {
            item.name = data.name
          }

          return item
        })

        this.alert.success(`'${data.name}' atualizado com sucesso!`)
        return data
      })
      .catch((error) => {
        return this.handleError(error)
      })
  }

  edit(obj) {
    const nameSplited = obj.name.split('.')
    this.editObj = angular.copy(obj)

    if (!(obj.type === 'FOLDER')) {
      this.editObj.name = nameSplited.filter((el, i) => i + 1 < nameSplited.length).join('.')
    }

    this.editObj._ext = nameSplited.length > 1 ? nameSplited[nameSplited.length - 1] : ''
    this.timeout(() => {
      $('#input_' + obj.id).focus().select()
    }, 200)
  }

  clearEdit() {
    this.editObj = {}
  }

  saveEdit() {
    this.rename(this.editObj)
    this.clearEdit()
  }

  remove(obj) {
    this.removeObj = obj
  }

  visualise(obj) {
    this.location.path('/admin/detalhe-documento/' + obj.id);
  }

  confirmRemove(resp) {
    if (resp) {
      this.resource(`${this.apiUrl}/docadministrativo/` + this.removeObj.id).delete().$promise.then((resp) => {
        this.pagination.list.some((el, i) => {
          if (el.id === this.removeObj.id) {
            this.pagination.list.splice(i, 1)
            return true
          }
          return false
        })
        this.alert.success(`'${this.removeObj.name}' removido com sucesso!`)
      }).catch(this.handleError.bind(this))
      return
    }
    return this.timeout(() => {
      this.removeObj = null
    }, 200)
  }
}

angular.module('eticca.admin').controller('admin.repository', [
  '$http',
  '$location',
  '$resource',
  '$timeout',
  'cloudSearchQuery',
  'alertService',
  '$scope',
  Repository
])
