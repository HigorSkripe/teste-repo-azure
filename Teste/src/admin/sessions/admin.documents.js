class Documents {
  constructor(http, resource, timeout, cloudSearchQuery, taTranslations, alert, user, localStorage) {
    this.http = http
    this.resource = resource
    this.timeout = timeout
    this.cloudSearchQuery = cloudSearchQuery
    this.taTranslations = taTranslations
    this.alert = alert
    this.user = user
    this.localStorage = localStorage
    this.apiUrl = window.__API_URL
    this.appRef = 'ADMIN'
    this.removeObj = null
    this.versaoDetail = null
    this.pagination = {
      search: '',
      grupoId: '',
      limit: 50,
      totalPages: 0,
      page: 0,
      list: [],
      range: [],
      orderBy: {
        key: 'versioning_version',
        order: 'desc'
      },
      order: {
        predicate: 'versioning_version',
        reverse: true
      },
      next: this.nextPage.bind(this),
      prev: this.previousPage.bind(this),
      goTo: this.goToPage.bind(this)
    }
    this.modalForm = {
      error: '',
      title: '',
      doing: '',
      button: '',
      model: {
        id: '',
        nome: '',
        versao: '',
        descricao: '',
        copyContent: false // isAtivo: true,
      },
      validations: {},
      clearModalForm: this.clearModalForm.bind(this),
      open: this.openModalForm.bind(this),
      save: this.saveModalForm.bind(this)
    }
    this.documentos = [
      {
        title: window.i18n('#dashboard'),
        text: '',
        name: 'dashboard',
        default: true
      },
      {
        title: window.i18n('#introducao'),
        text: '',
        name: 'intro'
      },
      {
        title: 'Código de Ética',
        titulo: '',
        text: '',
        name: 'codigo_etica'
      },
      {
        title: 'Código de Conduta',
        titulo: '',
        text: '',
        name: 'codigo_conduta'
      },
      {
        title: window.i18n('#termo.aceite'),
        text: '',
        name: 'termo_aceite'
      },
      {
        title: window.i18n('#boas.vindas'),
        text: '',
        name: 'boas_vindas',
        assunto: ''
      },
      {
        title: window.i18n('#novo.programa'),
        text: '',
        name: 'novo_programa',
        assunto: ''
      }
    ]
    this.editor = {
      options: {
        toolbar: [
          [
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'p',
            'pre',
            'quote'
          ],
          [
            'bold',
            'italics',
            'underline',
            'strikeThrough',
            'ul',
            'ol',
            'redo',
            'undo',
            'clear'
          ],
          [
            'justifyLeft',
            'justifyCenter',
            'justifyRight',
            'justifyFull',
            'indent',
            'outdent'
          ],
          [
            'addNome',
            'addCpf',
            'addData',
            'addEmpresa',
            'addCnpj',
            'textColor',
            'addTabela',
            'html',
            'insertImage',
            'insertVideo',
            'insertLink'
          ],
          ['clickAqui']
        ]
      },
      model: '',
      active: ''
    }
    this.listDocs = []
    this.idDoc = ''
    this._onInit()
  }

  _onInit() {
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
  }

  update() {
    this.pagination.grupoId = this.selectedGrupo
    this.goToPage(0, true)
  }

  orderBy(predicate) {
    this.pagination.orderBy = {
      key: predicate,
      order: this.pagination.order.reverse ? 'desc' : 'asc'
    }
    this.goToPage(0, false, true)
    this.pagination.order.reverse = this.pagination.order.predicate !== predicate ? false : !this.pagination.order.reverse
    this.pagination.order.predicate = predicate
  }

  goToPage(page, first, ordering) {
    if (this.pagination.page === page && !first && !ordering) {
      return
    }

    this.pagination.page = page

    return this.applyPagination()
  }

  pesquisar(searchText) {
    this.pagination.page = 0

    return this.applyPagination(searchText ? (searchText.indexOf('*') >= 0 ? '' : `*${searchText}*`) : '')
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

  applyPagination(search) {
    const queryFields = [['versioning_type', 'documento'], ['versioning_group_id', this.pagination.grupoId]]

    if (search) {
      queryFields.push(['versioning_name', `"${search}"`])
    }

    const params = {
      entity: 'versioning',
      page: this.pagination.page,
      limit: this.pagination.limit,
      query: queryFields,
      sort: `${this.pagination.orderBy.key} ${this.pagination.orderBy.order}`
    }

    this.pagination.list = []

    /* istanbul ignore next */
    this.cloudSearchQuery.getPage(params)
      .then(this.successDocuments.bind(this))
      .catch(this.errorDocumentos.bind(this))
  }

  successDocuments(data) {
    this.pagination.list = data.data
    this.pagination.totalPages = data.totalPages
    this.pagination.page = data.page
    this.pagination.range = Array.apply(null, Array(data.totalPages)).map((_, i) => {
      return i
    })
  }

  errorDocumentos(error) {
    this.alert.error(error?.data?.message || 'Erro ao tentar obter as versões!')
  }

  novo() {
    this.showDocs = true;
    this.docsParaInsert();
  }

  docsParaInsert() {
    debugger;
    const query = [['filestorage_type', 'PDF']]
    const params = {
      entity: 'filestorage',
      limit: 100,
      page: 0,
      query: query,
      sort: `${this.pagination.orderBy.key} ${this.pagination.orderBy.order}`
    }
    this.cloudSearchQuery.getPage(params)
      .then((data) => {

        let list = [];
        data.data.forEach(e => {
          list.push({
            id: e.id,
            criador: e.userName,
            nome: e.name,
            url: '',
            documentoId: ''
          });
        });
        this.listDocs = list;
      })
      .catch(this.errorDocumentos.bind(this))
  }

  editar() {
    this.documentos.forEach((el) => {
      /* istanbul ignore next */
      this.resource(`${this.apiUrl}/documento/` + el.name + '/' + this.lastSelectedVersaoId).get().$promise
        .then((data) => {
          el.text = data.texto
          if (this.isEmail(el.name)) {
            el.assunto = data.assunto
          }
          if (this.isCodEticConduta(el.name)) {
            el.titulo = data.titulo
            if (el.titulo) {
              el.title = data.titulo
            } else {
              if (el.name === 'codigo_conduta') {
                el.title = 'Código de Conduta'
              } else {
                el.title = 'Código de Ética'
              }
            }
          }
          if (el.default) {
            this.setActive(el, true);
          }
        })
    })
    $('#modalDetail').modal('hide');
    this.showDocs = true;
    this.docsParaInsert();
  }

  cancelar() {
    this.showDocs = false
    this.clearDocumentos()
    this.lastSelectedVersaoId = null
  }

  saveModalForm() {
    if (!this.validateModalForm()) {
      return
    }
    return this.modalForm.doing === 'new' ? this.createNew() : this.saveEdit()
  }

  createNew() {
    const body = {}
    for (const i in this.modalForm.model) {
      if (this.modalForm.model[i]) {
        body[i] = this.modalForm.model[i]
      }
    }
    body.grupoId = this.selectedGrupo
    this.resource(`${this.apiUrl}/versaodocumento`).save(body).$promise
      .then((data) => {
        this.pagination.list.unshift(data)
        this.alert.success('Versão "' + data.nome + '" criada com sucesso!')
        $('#modalForm').modal('hide')
      })
      .catch((error) => {
        this.alert.error(error?.data?.message || 'Ocorreu um erro inesperado!')
      })
  }

  saveEdit() {
    const body = {}
    for (const i in this.modalForm.model) {
      if (angular.isDefined(this.modalForm.model[i])) {
        body[i] = this.modalForm.model[i]
      }
    }
    body.grupoId = this.selectedGrupo
    /* istanbul ignore next */
    this.resource(`${this.apiUrl}/versaodocumento/` + this.modalForm.model.id, null, { update: { method: 'PUT' } }).update(body).$promise
      .then((data) => {
        this.pagination.list.map((versao) => {
          if (versao.id === data.id) {
            versao.nome = data.nome
            versao.descricao = data.descricao
          }
          return versao
        })
        this.alert.success('Versão "' + this.modalForm.model.nome + '" atualizada com sucesso!')
        this.versaoDetail = null
        $('#modalForm').modal('hide')
      })
      .catch((error) => {
        this.alert.error(error?.data?.message || 'Ocorreu um erro inesperado!')
      })
  }

  insert(doc) {
    debugger;
    if (doc.documentoId != '' && doc.documentoId == this.idDoc) {
      this.alert.error('Já foi criada e inserida uma imagem desse arquivo no documento.')
    } else {
      const fileConvert = {
        documentId: this.idDoc,
        files: [
          doc.id
        ]
      };
      this.http.post(`${this.apiUrl}/documento/generate/images`, fileConvert)
        .then((data) => {
          debugger;
          doc.url = data.data[0].url;
          doc.documentoId = this.idDoc;
          this.listDocs.filter(d => d.id == doc.id)[0] = doc;
          this.editor.model = this.editor.model + `<p><img id="${doc.id}" src="${doc.url}"></p>`
        })
        .catch((error) => {
          this.alert.error(error?.data ? error.data.message : 'Ocorreu um erro inesperado!')
        })
    }
  }

  removeImage(doc) {
    const fileConvert = {
      documentId: doc.documentoId,
      files: [
        doc.url
      ]
    };

    this.http.delete(`${this.apiUrl}/documento/generate/images`, fileConvert)
      .then((data) => {
        debugger;
        doc.url = ''
        doc.documentoId = '';
        this.listDocs.filter(d => d.id == doc.id)[0] = doc;
        this.editor.model = this.editor.model.replace(/<p[^>]*>\s*<img[^>]+src\s*=\s*['"][^'"]+['"][^>]*>\s*<\/p>/g, '');
        this.alert.success(`A imagem ${doc.nome} foi removida com sucesso`);
      })
      .catch((error) => {
        this.alert.error(error?.data ? error.data.message : 'Ocorreu um erro inesperado!')
      })
  }

  getImages(){
    this.http.get(`${this.apiUrl}/documento/generate/images/${this.idDoc}`)
      .then((data) => {
        debugger;
        data.data.forEach( d => {
          this.listDocs.forEach(doc => {
            if(doc.id == d.filename.split('.')[0]){
              doc.url = d.url;
              doc.documentoId = this.idDoc;
            }
          });
        });
      })
      .catch((error) => {
        this.alert.error(error?.data ? error.data.message : 'Ocorreu um erro inesperado!')
      })
  }

  viewVersao(event, versaoDocumento) {
    this.versaoDetail = angular.copy(versaoDocumento)
    this.resource(`${this.apiUrl}/versaodocumento/${this.versaoDetail.id}`).get().$promise
      .then((data) => {
        this.versaoDetail = data
        this.lastSelectedVersaoId = this.versaoDetail.id
        $('#modalDetail').modal('show')
        this.clearDocumentos()
      })
      .catch(error => {
        this.alert.error(error?.data?.message || 'Erro ao tentar obter os dados da versão!')
      })
  }

  openModalForm(doing, title, btn, versao) {
    $('#modalDetail').modal('hide')
    $('#versao').prop('disabled', false)
    $('#copyContent').prop('disabled', false)
    this.clearModalForm()
    this.modalForm.doing = doing
    this.modalForm.title = title
    this.modalForm.button = btn

    if (doing !== 'edit') {
      this.resource(`${this.apiUrl}/versaodocumento/sugestao?grupoId=` + this.selectedGrupo).get().$promise
        .then((data) => {
          this.modalForm.model.versao = data.versaoSugerida
          this.isPrimeiraVersao = data.primeiraVersao
        })
    }

    $('#modalForm').modal('show')
    if (angular.isDefined(versao)) {
      this.modalForm.model.id = versao.id
      this.modalForm.model.nome = versao.nome
      this.modalForm.model.versao = versao.versao
      this.modalForm.model.copyContent = versao.copyContent
      $('#versao').prop('disabled', true)
      $('#copyContent').prop('disabled', true)
      this.modalForm.model.descricao = versao.descricao
    }
  }

  openModalDocs() {
    $('#modalDocs').modal('show');
  }

  clearModalForm() {
    for (const i in this.modalForm.model) {
      this.modalForm.model[i] = typeof this.modalForm.model[i] === 'boolean' ? false : ''
    }
    this.modalForm.validations = {}
  }

  clearDocumentos() {
    for (const i in this.documentos) {
      this.documentos[i].texto = ''
    }
  }

  save() {
    debugger;
    const body = {
      texto: this.editor.model || '',
      versaoId: this.lastSelectedVersaoId
    }

    if (this.editor.showAssunto) {
      body.assunto = this.editor.assunto || ''
    }

    if (this.editor.showNomeTitulo) {
      body.titulo = this.editor.titulo || ''
    }

    this.listDocs.filter(d => d.documentId == this.idDoc).forEach(doc => {
      if (!this.editor.model.includes(doc.url)) {
        this.removeImage(doc);
      }
    });


    this.resource(`${this.apiUrl}/documento/` + this.editor.active, null, { update: { method: 'PUT' } }).update(body).$promise
      .then((data) => {
        this.pagination.list.some((el, i) => {
          return this.documentos.some((el, i) => {
            if (el.name === data.nome) {
              this.documentos[i].text = data.texto
              this.documentos[i].title = data.titulo
              return true
            }
            return false
          })
        })

        this.alert.success('Documento "' + this.getDocumentoTitle(data.nome) + '" salvo com sucesso!')
        this.editar()
      })
      .catch(this.errPromise.bind(this))
  }

  errPromise() {
    this.alert.error('Ocorreu um erro inesperado!')
  }

  setActive(doc, _confirm) {
    if ((this.editor.model !== this.editor._bkp || this.editor.assunto !== this.editor._assunto || this.editor.titulo !== this.editor._titulo) && !_confirm) {
      return this.alert.alert({
        title: 'As alterações não foram salvas. Deseja continuar?',
        text: 'Se você continuar as alterações no documento atual serão perdidas.',
        type: 'warning',
        showCancelButton: true,
        cancelButtonText: 'Voltar',
        confirmButtonText: 'Continuar',
        closeOnConfirm: true
      }, () => {
        return this.setActive(doc, true)
      })
    }

    this.idDoc = this.versaoDetail.documentos.filter(d => d.nome === doc.name)[0].id;

    this.getImages();
    this.editor._assunto = angular.copy(doc.assunto)
    this.editor._titulo = angular.copy(doc.titulo)
    this.editor.showAssunto = this.isEmail(doc.name)
    this.editor.showNomeTitulo = this.isCodEticConduta(doc.name)
    this.editor.assunto = angular.copy(doc.assunto)
    this.editor.titulo = angular.copy(doc.titulo)
    this.editor.model = angular.copy(doc.text)
    this.editor._bkp = angular.copy(doc.text)
    this.editor.active = doc.name
    if ($('div[ng-hide="showHtml"]').hasClass('ng-hide')) {
      $('textarea[ng-model="html"]').focus()
      return
    }
    $('div[ng-model="html"]').focus()
  }

  isEmail(name) {
    return name === 'boas_vindas' || name === 'novo_programa'
  }

  isCodEticConduta(name) {
    return name === 'codigo_etica' || name === 'codigo_conduta' || name === 'intro' || name === 'termo_aceite'
  }

  validateModalForm() {
    let isValid = true
    this.modalForm.validations = {}
    if (!this.modalForm.model.nome) {
      isValid = false
      this.modalForm.validations.nome = 'Campo requerido!'
    }
    if (!this.modalForm.model.versao) {
      isValid = false
      this.modalForm.validations.versao = 'Campo requerido!'
    }
    return isValid
  }

  getDocumentoTitle(name) {
    return this.documentos.find(doc => doc.name === name)?.title || ''
  }

  remove(obj) {
    this.removeObj = obj
  }

  confirmRemove(resp) {
    if (resp) {
      this.resource(`${this.apiUrl}/versaodocumento/` + this.removeObj.id).delete().$promise
        .then(() => {
          this.pagination.list.some((el, i) => {
            if (el.id === this.removeObj.id) {
              this.pagination.list.splice(i, 1)
              return true
            }

            return false
          })

          this.alert.success('Documentos removidos com sucesso')
        })
        .catch(this.handleError.bind(this))
      return
    }
    return this.timeout(() => {
      this.removeObj = null
    }, 200)
  }

  handleError(error) {
    this.alert.error(error && error.data && error.data.message ? error.data.message : 'Ocorreu um erro inesperado!')
  }
}

angular.module('eticca.admin').controller('admin.documents', [
  "$http",
  '$resource',
  '$timeout',
  'cloudSearchQuery',
  'taTranslations',
  'alertService',
  'userService',
  'storageService',
  Documents
])
