const rawHtml = (sce, user, $filter) => {
  return function (val) {
    const html = String(val).replace(/\{\{nome\}\}/g, user.nome || '').replace(/\{\{data\}\}/g, new Date().toLocaleString('pt-br', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })).replace(/\{\{cnpj\}\}/g, user.empresa ? $filter('cpfCnpj')(user.empresa.cnpj) : '').replace(/\{\{empresa\}\}/g, user.empresa ? user.empresa.nome : '').replace(/\{\{cpf\}\}/g, $filter('cpfCnpj')(user.cpf) || '')
    return sce.trustAsHtml(html)
  }
}

angular.module('eticca.common').filter('rawHtml', [
  '$sce',
  'userService',
  '$filter',
  rawHtml
])
