const alertService = () => {
  const messageAndTitleError = 'No message and no title alert!'
  /**
   * Alerta básico apenas com título e mensagem
   */
  const basic = (title, message) => {
    if (!title && !message) {
      throw new Error(messageAndTitleError)
    }
    return swal(title, message)
  }
  /**
   * Alerta customizado com opções diretamente ao sweet-alert
   */
  const alert = (options, cb) => {
    if (!options) {
      throw new Error('No options alert!')
    }
    return swal(options, cb)
  }
  /**
   * Alerta de sucesso padrão
   */
  const success = (title, message) => {
    if (!title && !message) {
      throw new Error(messageAndTitleError)
    }
    return swal(title, message, 'success')
  }
  /**
   * Alerta de erro padrão
   */
  const error = (title, message) => {
    if (!title && !message) {
      throw new Error(messageAndTitleError)
    }
    return swal(title, message, 'error')
  }
  /**
   * Alerta de advertência padrão
   */
  const warning = (title, message) => {
    if (!title && !message) {
      throw new Error(messageAndTitleError)
    }
    return swal(title, message, 'warning')
  }

  return {
    basic,
    alert,
    success,
    error,
    warning
  }
}

angular.module('eticca.common').service('alertService', [alertService])
