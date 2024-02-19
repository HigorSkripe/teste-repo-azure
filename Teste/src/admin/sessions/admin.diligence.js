class Diligence {
  constructor (resource, user, http, alert) {
    this.resource = resource
    this.user = user
    this.http = http
    this.alert = alert
    this.apiUrl = window.__API_URL
    this.appRef = 'ADMIN'
    this.model = {
      nome: '',
      cpfCnpj: ''
    }
    this.disabledPesquisarSalvar = false
    this._onInit()
  }

  _onInit () {}

  clearPesquisa () {
    for (const i in this.model) {
      if (this.model[i]) {
        this.model[i] = ''
      }
    }
    this.clearPainel()
  }

  clearPainel () {
    this.painelRespostas = null
  }

  mascara () {
    const tamanho = this.model.cpfCnpj.replace(/\D/g, '').length

    if (tamanho <= 11) {
      $('#cpfCnpj').inputmask('999.999.999-99[9]')
    } else {
      $('#cpfCnpj').inputmask('99.999.999/9999-99')
    }
  }

  enviaPesquisa () {
    if (this.disabledPesquisarSalvar) {
      return
    }

    const body = {}
    for (const i in this.model) {
      if (this.model[i]) {
        if (i === 'cpfCnpj') {
          this.model[i] = this.model[i].replace(/\D/g, '')
        }
        body[i] = this.model[i]
      }
    }
    // Limpando a exibição da busca anterior.
    this.clearPainel()

    this.disabledPesquisarSalvar = true

    this.resource(`${this.apiUrl}/diligencia/search`).save(body).$promise
      .then((resp) => {
        this.painelRespostas = resp
        this.disabledPesquisarSalvar = false
      })
      .catch((error) => {
        this.disabledPesquisarSalvar = false
        this.alert.error(error && error.data && error.data.message ? error.data.message : 'Ocorreu um erro inesperado!')
      })
  }

  salvar () {
    if (this.disabledPesquisarSalvar) {
      return
    }

    const body = this.painelRespostas
    this.disabledPesquisarSalvar = true

    this.resource(`${this.apiUrl}/report/diligences`).save(body).$promise
      .then(() => {
        this.disabledPesquisarSalvar = false
        this.alert.success('Pesquisa salva com sucesso! Vá no Menu Repositório para baixá-la.')
        this.clearPesquisa()
      })
      .catch((error) => {
        this.disabledPesquisarSalvar = false
        this.alert.error(error && error.data ? error.data.message : 'Ocorreu um erro inesperado!')
      })
  }

  validarCampos () {
    if (!/([0-9]{2}[.]?[0-9]{3}[.]?[0-9]{3}[/]?[0-9]{4}[-]?[0-9]{2})/.test(this.cnpj)) {
      this.alert.error('CNPJ inválido')
      return false
    }
    return true
  }

  toTop () {
    $('html, body').animate({ scrollTop: 0 }, 'fast')
  }
}

angular.module('eticca.admin').controller('admin.diligence', [
  '$resource',
  'userService',
  '$http',
  'alertService',
  Diligence
])
