const paginationService = (resource) => {
  const apiUrl = window.__API_URL

  /**
   *
   * @param from String de onde vem a requisição
   * @param page Int página que quero
   * @param limit Int tamanho de cada página
   * @param orderBy Object ordenação dos valores
   * @param search Para pesquisa paginada
   * @param programaId id do programa
   * @returns {*|Function}
   */
  const getPage = (from, grupoId, page, limit, orderBy, search, programaId) => resource(`${apiUrl}/:from/pages`, { from: from }).save({
    page: page,
    limit: limit,
    orderBy: orderBy || {},
    search: search,
    programaId: programaId,
    grupoId: grupoId
  }).$promise

  return {
    getPage
  }
}

angular.module('eticca.common').factory('paginationOldService', [
  '$resource',
  paginationService
])
