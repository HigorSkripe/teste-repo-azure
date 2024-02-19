const uploadService = function (resource) {
  const apiUrl = window.__API_URL
  const _apiPartUrl = `${apiUrl}/docadministrativo`
  /**
   * Obter todos os arquivos enviados sem paginação
   * @returns {Promise<Array>} - Promise de lista contendo os metadados dos arquivos
   */
  this.all = () => resource(_apiPartUrl).get().$promise

  /**
   * Obter uma página dos arquivos enviados
   * @param {number} page - Número da página que se quer
   * @param {number} limit - Limite de itens por página
   * @param {Object} orderBy - Ordenação dos elementos { key: string , order: string('asc'||'desc') }
   * @returns {Promise<Array>} - Promise de lista contendo os metadados dos arquivos da página requerida
   */
  this.pages = (page, limit, orderBy, father, filter) => resource(_apiPartUrl + '/pages').save({
    page: page,
    limit: limit,
    orderBy: orderBy,
    father: father || null,
    filter: filter
  }).$promise

  /**
   * Atualizar arquivos ou pastas
   * @param {File|Folder} body - Objeto referente ao que vai ser atualizado com id incluso
   * @returns {Promise<Metadado>} - Promise com o metadado do arquivo atualizado
   */
  this.update = (body) => resource(_apiPartUrl + '/' + body.id, {}, { update: { method: 'PUT' } }).update(body).$promise

  /**
   * Cria uma pasta
   *
   */
  this.createFolder = (name, father) => resource(_apiPartUrl).save({
    name: name,
    type: 'FOLDER',
    father: father || null
  }).$promise
}

angular.module('eticca.common').service('uploadService', [
  '$resource',
  uploadService
])
