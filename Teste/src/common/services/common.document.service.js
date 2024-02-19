import { find, prop, propEq } from 'ramda'

const fixedTitles = {
  dash: 'Dashboard',
  intro: 'Introdução',
  codigo_etica: 'Código de Ética',
  codigo_conduta: 'Código de Conduta',
  termo_aceite: 'Termo de Aceite',
  faq: 'FAQ',
  treinamento: 'Treinamento',
  certificacao: 'Certificação',
  boas_vindas: 'Boas Vindas (E-mail)',
  novo_programa: 'Novo Programa (E-mail)'
}

angular.module('eticca.common').service('documentService', ['$http', documentService])

/**
 * @description Document service
 * @author Douglas Lima
 * @date 06/07/2023
 * @param {*} http
 * @return {*}
 */
function documentService (http) {
  return {
    getDocuments: getDocuments(http),
    getDocumentTitle
  }
}

/**
 * @description Get all documents by versionId
 * @author Douglas Lima
 * @date 06/07/2023
 * @param {*} http
 * @return {*}
 */
function getDocuments (http) {
  const apiUrl = window.__API_URL

  return () => http.get(`${apiUrl}/documento/list`).then(prop('data'))
}

/**
 * @description Get document title by name
 * @author Douglas Lima
 * @date 06/07/2023
 * @param {*} documentName
 * @param {*} documents
 * @return {*}
 */
function getDocumentTitle (documentName, documents) {
  const document = find(propEq('nome', documentName), documents)

  return document?.titulo || getFromFixedTitle(documentName)
}

/**
 * @description Get title from fixed title list
 * @author Douglas Lima
 * @date 06/07/2023
 * @param {*} documentName
 * @return {*}
 */
function getFromFixedTitle (documentName) {
  const title = fixedTitles[documentName]

  return title || ''
}
