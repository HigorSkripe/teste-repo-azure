import * as XLSX from 'xlsx';
class Repository {
  constructor($scope, $sce, http, resource, $routeParams, timeout, $location, cloudSearchQuery, alert) {
    this.$scope = $scope;
    this.$sce = $sce;
    this.http = http;
    this.resource = resource;
    this.timeout = timeout;
    this.$location = $location;
    this.cloudSearchQuery = cloudSearchQuery;
    this.alert = alert;
    this.apiUrl = window.__API_URL;
    this.appRef = 'ADMIN';
    this.tituloDoc = '';
    this.doc = null;
    this.editObj = {};
    this.$routeParams = $routeParams;
    this.edicaoHabilitada = false;
    this.isImage = false;
    this.isDoc = false;
    this.isPDF = false;
    this.isXlsx = false;
    this.isPPTX = false;
    this.uploadInput = {
      multiple: false,
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

    this._onInit();
  }

  async _onInit() {
    this.docId = this.$routeParams.docId
    const res = await this.http.get(`${this.apiUrl}/docadministrativo/open/${this.docId}`);

    this.tituloDoc = res.data.filename;

    if (res.data.contentType.includes('image')) {
      this.isImage = true;
      this.doc = res.data.url;
      this.$scope.$apply();
    } else if (res.data.contentType.includes('pdf')) {
      this.isPDF = true;
      this.doc = this.$sce.trustAsResourceUrl(res.data.url + '&toolbar=false');
      this.$scope.$apply();
    } else if (res.data.contentType.includes('sheet')) {
      this.isXlsx = true;

      // Faz o download do arquivo
      this.http.get(res.data.url, { responseType: 'arraybuffer' })
        .then(result => {
          // Converte o conteúdo do arquivo para uma planilha do tipo XLSX
          const workbook = XLSX.read(result.data, { type: 'array' });

          // Obtém a primeira planilha
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Converte a planilha para um objeto JSON
          this.doc = this.$sce.trustAsHtml(XLSX.utils.sheet_to_html(worksheet, { raw: true }));

          this.$scope.$apply();
        })
        .catch(error => {
          console.error(error);
        });
    } else if (res.data.contentType.includes('presentation')) {
      this.isPPTX = true;
      this.http.get(res.data.url, { headers: { 'Content-Type': res.data.contentType }, responseType: 'blob' })
        .then(result => {

          var reader = new FileReader();
          reader.readAsDataURL(result.data);
          reader.onloadend =  () => {
            var base64data = reader.result;
            console.log(base64data);
            this.doc = this.$sce.trustAsHtml("data:application/pdf;base64, " + base64data.split(',')[1]);
            this.$scope.$apply();
          }

        });
    } else {
      this.isDoc = true;
      var mammoth = require("mammoth");

      this.http.get(res.data.url, { headers: { 'Content-Type': res.data.contentType }, responseType: 'arraybuffer' })
        .then(result => {

          mammoth.convertToHtml({ arrayBuffer: result.data })
            .then(resp => {

              this.doc = this.$sce.trustAsHtml(resp.value); // The generated HTML
              var messages = resp.messages; // Any messages, such as warnings during conversion
              this.$scope.$apply();
            })
            .catch(function (error) {
              console.error(error);
            });
        });
    }

  }

  goBack() {

    this.$location.path('/admin/repositorio-documentos/');
  }

  async upload(model, complete) {
    this.startProgress()
    const params = {
      father: this.crumbPastas.length ? this.crumbPastas[this.crumbPastas.length - 1].id : '',
      data: Object.keys(this.uploadInput.model).map(key => ({ filename: this.uploadInput.model[key].name, size: this.uploadInput.model[key].size, mimetype: this.uploadInput.model[key].type }))
    }

    try {
      const res = await this.http.get(`${this.apiUrl}/docadministrativo/download/${this.docId}`)


      const oldFile = this.uploadInput.model[i]
      const blob = oldFile.slice(0, oldFile.size, res.data.contentType)
      const file = new File([blob], obj.filename, { type: res.data.contentType })

      this.resource(`${this.apiUrl}/docadministrativo/${this.docId}`, {},
        { update: { method: 'PUT' } })
        .update(file)
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


      this.completeProgress()
      this.applyPagination()
      complete()
    } catch (error) {
      console.log({ error })
      this.completeProgress()
      return this.handleError(error)
    }
  }

  async downloadFile() {
    try {
      const res = await this.http.get(`${this.apiUrl}/docadministrativo/download/${this.docId}`)

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

  /**
  * Renomear arquivo ou pasta passado no parâmetro
  * @param {File|Folder} - Arquivo ou pasta a ser renomeado
  * @return {void}
  */
}

angular.module('eticca.admin').controller('admin.repository-detail', [
  '$scope',
  '$sce',
  '$http',
  '$resource',
  '$routeParams',
  '$timeout',
  '$location',
  'cloudSearchQuery',
  'alertService',
  Repository
]);
