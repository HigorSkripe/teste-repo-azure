class Profile {
  constructor (resource, user, alert) {
    this.resource = resource
    this.user = user
    this.alert = alert
    this.apiUrl = window.__API_URL
    this.appRef = 'COLLABORATOR'

    this.novaSenha = ''
    this.confirmaNovaSenha = ''

    this._onInit()
  }

  _onInit () {
    return null
  }

  resetPasswordFields () {
    this.novaSenha = ''
    this.confirmaNovaSenha = ''
  }

  confirmar () {
    if (!this.validarSenhas()) return

    const senhas = {
      senha: this.novaSenha
    }
    this.resource(`${this.apiUrl}/usuario/changepassword`, {}, { update: { method: 'PUT' } }).update(senhas).$promise
      .then(() => {
        this.resetPasswordFields()
        this.alert.success('Senha atualizada com sucesso!')
      })
      .catch((error) => {
        this.alert.error(error?.message || error?.data?.message || 'Ocorreu um erro inesperado!')
      })
  }

  validarSenhas () {
    if (this.novaSenha.length === 0 && this.confirmaNovaSenha.length === 0) {
      this.alert.error('Todos os campos devem ser preenchidos')
      return false
    }
    if (this.novaSenha.length === 0) {
      this.alert.error('Não digitou a nova senha')
      return false
    }
    if (this.confirmaNovaSenha.length === 0) {
      this.alert.error('Não digitou a confirmação par a nova senha')
      return false
    }
    if (!/^(?=.*[0-9])(?=.*[a-zA-ZÇçÃãÂâÕõ¬¨ÄäËëÏïÖöÛû¹²³£¢¬§ªº])[\x20-\x7EÇçÃãÂâÕõ¬¨ÄäËëÏïÖöÛû¹²³£¢¬§ªº]+.{5,}$/.test(this.novaSenha)) {
      this.alert.error('A senha deverá ser composta no mínimo com 6 caracteres compostos de letras e números')
      return false
    }
    if (this.confirmaNovaSenha !== this.novaSenha) {
      this.alert.error('Nova senha e a confirmação devem ser iguais')
      return false
    }

    return true
  }
}

angular.module('eticca.collaborator').controller('profile', [
  '$resource',
  'userService',
  'alertService',
  Profile
])
