const paginationService = (resource) => {
  const apiUrl = window.__API_URL

  return {
    getPage
  }

  /**
   * @description Get the data page from a data type
   * @author Douglas Lima
   * @date 2022-04-12
   * @param {{ from: string; lastEvaluatedKey: Object; limit: number; grupoId: string; programaId: string; orderBy: Object; search: string; filter: string }} params params to get the page
   * @returns
   */
  function getPage (params) {
    const { from, lastEvaluatedKey, limit, grupoId, programaId, orderBy, search, filter, father } = params
    const options = { from: from }
    const body = {
      lastEvaluatedKey,
      limit,
      orderBy: orderBy || {},
      search,
      father,
      filter,
      programaId,
      grupoId
    }

    return resource(`${apiUrl}/:from/pages`, options).save(body).$promise
  }
}
angular.module('eticca.common').factory('paginationService', [
  '$resource',
  paginationService
])
