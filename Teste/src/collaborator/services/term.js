const term = (resource) => {
  const apiUrl = window.__API_URL
  const termPromise = resource(`${apiUrl}/documento/:route`)
  const padronize = (data) => ({ result: data.texto })
  const dashboard = termPromise.get({ route: 'dashboard' }).$promise.then(padronize)
  const introducao = termPromise.get({ route: 'intro' }).$promise.then(padronize)
  const codigoConduta = termPromise.get({ route: 'codigo_conduta' }).$promise.then(padronize)
  const codigoEtica = termPromise.get({ route: 'codigo_etica' }).$promise.then(padronize)
  const termoAceite = termPromise.get({ route: 'termo_aceite' }).$promise.then(padronize)

  return {
    dashboard,
    introducao,
    codigoConduta,
    codigoEtica,
    termoAceite
  }
}

angular.module('eticca.collaborator').factory('term', [
  '$resource',
  term
])
