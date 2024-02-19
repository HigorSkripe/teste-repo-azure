import moment from 'moment'
import { includes, is, isEmpty, isNil, not, reduce } from 'ramda'

angular.module('eticca.common').factory('cloudSearchQuery', [
  '$http',
  function (http) {
    const cloudSearchUrl = 'https://9sopqu7xoe.execute-api.us-west-2.amazonaws.com/default/search'

    const auth = JSON.parse(localStorage.getItem('ETICCA.AUTH') || '{}')
    const accessToken = auth?.A0_CLAIMS?.raw?.accessToken
    const alias = auth?.A0_CLAIMS?.actualAlias

    // To translate the branch types to show on screen
    const branchType = {
      COMPLAINT: 'DENÚNCIA',
      GENERAL: 'GERAL',
      USER: 'USUÁRIO'
    }

    const fromToFunctions = {
      branch: applyFromToBranchData,
      complaint: applyFromToComplaintData,
      faq: applyFromToFaqData,
      filestorage: applyFromToFileStorageData,
      preregister: applyFromToPreRegisterData,
      program: applyFromToProgramData,
      publicentity: applyFromToPublicEntityData,
      risk: applyFromToRiskData,
      stakeholder: applyFromToStakeholderData,
      translationkey: applyFromToTranslationKeyData,
      user: applyFromToUserData,
      usergroup: applyFromToUserGroupData,
      userprogress: applyFromToUserProgressData,
      versioning: applyFromToVersioningData,
      videotraining: applyFromToVideoTrainingData
    }

    return {
      getPage
    }

    /**
     * @description
     * @author Douglas Lima
     * @date 2022-05-16
     * @param {{
     *  entity: string,
     *  page: number,
     *  limit: number,
     *  query: [string, string | number | boolean][],
     *  sort: string
     * }}
     * @returns {Promise<any>}
     */
    function getPage ({
      entity,
      type, // facet or query
      page,
      limit,
      query, // [['fieldName', 'fieldValue']]
      sort, // title asc
      facets, // [['from', 'to', '<convertToNumber>']]
      fields = '_all_fields'
    }) {
      const resourceParams = {
        fields,
        sort: sort || '_score desc',
        limit,
        start: page * limit
      }
      const requestOptions = {
        headers: {
          alias,
          Authorization: `Bearer ${accessToken}`
        }
      }

      // Generating the query result to apply the search
      const fieldsToSearch = [...(query || []), ['enabled', 1]]
      const [queryResult] = reduce(
        ([acc, fieldsToSearchControl], [field, value]) => {
          if (isNil(value) || not(is(String, value) || is(Number, value)) || includes(field, fieldsToSearchControl)) return [acc, fieldsToSearchControl]

          // Saving the field being added to the lookup
          fieldsToSearchControl.push(field)

          if (!acc) return [`${[field]}:${formatValue(value)}`, fieldsToSearchControl]

          return [`${acc} ${[field]}:${formatValue(value)}`, fieldsToSearchControl]
        },
        ['', []],
        fieldsToSearch
      )

      // Defulat query params
      const queryParams = `q=${encodeURIComponent(queryResult)}`
      const queryParser = '&q.parser=lucene'

      if (type === 'facet') {
        const querySize = '&size=0'
        const queryStart = '&start=0'

        const fieldsToFacet = facets || []
        const [queryFacet] = reduce(
          ([acc, fieldsToSearchControl], [field]) => {
            if (isNil(field) || isEmpty(field) || not(is(String, field)) || includes(field, fieldsToSearchControl)) return [acc, fieldsToSearchControl]

            // Saving the field being added to the facet
            fieldsToSearchControl.push(field)

            return [`${acc}&facet.${field}=${encodeURIComponent('{sort:\'bucket\', size:100}')}`, fieldsToSearchControl]
          },
          ['', []],
          fieldsToFacet
        )

        const queryString = `${queryParams}${queryParser}${querySize}${queryStart}${queryFacet}`

        return http.get(`${cloudSearchUrl}/${entity}?${queryString}`, requestOptions)
          .then(data => applyFromToFacetData(data, fieldsToFacet))
      }

      const queryReturn = `&return=${encodeURIComponent(resourceParams.fields)}`
      const querySort = `&sort=${encodeURIComponent(resourceParams.sort)}`
      const querySize = `&size=${encodeURIComponent(resourceParams.limit)}`
      const queryStart = `&start=${encodeURIComponent(resourceParams.start)}`

      const queryString = `${queryParams}${queryParser}${queryReturn}${querySort}${querySize}${queryStart}`

      return http.get(`${cloudSearchUrl}/${entity}?${queryString}`, requestOptions)
        .then(data => applyFromToListData(entity, data, page, limit))
    }

    /**
     * @param {Objet[]} result list of data type
     * @param {[string, string][]} fieldsToFacet fields to apply from to based on facet results
     * @returns
     */
    function applyFromToFacetData (result, fieldsToFacet) {
      const { facets, hits: { found } } = (result && result.data) ?? { facets: {}, hits: { found: 0 } }

      return {
        count: found,
        facets: reduce(
          (acc, [from, to, convert]) => {
            const facet = facets[from]

            if (isNil(to) || isEmpty(to) || not(is(String, to)) || isNil(facet) || isEmpty(facet) || not(is(Object, facet)) || isNil(facet.buckets) || not(is(Array, facet.buckets))) return acc

            return {
              ...acc,
              [to]: facet.buckets.map(item => ({ nome: convert ? applyParseNumber(item.value) : item.value, count: item.count }))
            }
          },
          {},
          fieldsToFacet
        )
      }
    }

    /**
     * @param {string} entity entity type
     * @param {Objet[]} result list of data type
     * @returns
     */
    function applyFromToListData (entity, result, page, limit) {
      const { hits: { found, hit } } = (result && result.data) ?? { hits: { found: 0, hit: [] } }

      const data = Array.isArray(hit) ? fromToFunctions[entity](hit) : []

      return {
        page,
        limit,
        data,
        count: found,
        totalPages: found && limit ? Math.ceil(found / limit) : 1
      }
    }

    function applyConvertDateToLocale (date) {
      if (!date || !moment(date).isValid()) return date

      return new Date(moment(date).toLocaleString())
    }

    function applyParseNumber (number) {
      try {
        return (number || '0').indexOf('.') >= 0 ? parseFloat((number || '0')) : parseInt((number || '0'))
      } catch (error) {
        // If error, return the number as it's arrived, probably the number is just a text.
        return number
      }
    }

    function applyFromToCommonData (fields) {
      return !fields
        ? {}
        : {
            id: fields.global_id,
            active: fields.enabled === '1',
            clientAlias: fields.client_alias,
            insertedAt: applyConvertDateToLocale(fields.created_at),
            userId: fields.created_user_id,
            userName: fields.created_user_name,
            updatedAt: applyConvertDateToLocale(fields.updated_at),
            updatedUserId: fields.updated_user_id,
            updatedUserName: fields.updated_user_name
          }
    }

    function applyFromToBranchData (data) {
      return data.map(item => ({
        ...applyFromToCommonData(item.fields),
        empresaId: item.fields.branch_company_id,
        nome: item.fields.branch_name,
        empresa: item.fields.branch_company_name,
        filialId: item.fields.branch_reference_id,
        filialReferencia: item.fields.branch_reference_name || '-',
        tipo: branchType[item.fields.branch_type]
      }))
    }

    function applyFromToComplaintData (data) {
      return data.map(item => ({
        ...applyFromToCommonData(item.fields),
        protocolo: item.fields.complaint_protocol,
        status: item.fields.complaint_status,
        problema: item.fields.complaint_problem,
        filialId: item.fields.complaint_branch_id,
        filial: item.fields.complaint_branch_name || '-',
        cidade: item.fields.complaint_city
      }))
    }

    function applyFromToFaqData (data) {
      return data.map(item => ({
        ...applyFromToCommonData(item.fields),
        item: item.fields.faq_item,
        subItems: item.fields.faq_sub_items
      }))
    }

    function applyFromToFileStorageData (data) {
      return data.map(item => ({
        ...applyFromToCommonData(item.fields),
        name: item.fields.filestorage_name,
        father: item.fields.filestorage_father_id,
        fatherName: item.fields.filestorage_father_name,
        type: item.fields.filestorage_type,
        size: item.fields.filestorage_size
      }))
    }

    function applyFromToPreRegisterData (data) {
      return data.map(item => ({
        ...applyFromToCommonData(item.fields),
        email: item.fields.preregister_email,
        nome: item.fields.user_name || item.fields.preregister_name || '-',
        cpf: item.fields.user_email || item.fields.preregister_cpf || '-',
        filialId: item.fields.preregister_branch_id,
        filial: item.fields.preregister_branch_name || '-',
        secaoId: item.fields.preregister_section_id,
        secao: item.fields.preregister_section_name || '-',
        grupoId: item.fields.preregister_group_id,
        grupo: item.fields.preregister_group_name
      }))
    }

    function applyFromToProgramData (data) {
      return data.map(item => ({
        ...applyFromToCommonData(item.fields),
        nome: item.fields.program_name,
        versao: item.fields.program_version,
        grupoId: item.fields.program_group_id,
        grupo: item.fields.program_group_name
      }))
    }

    function applyFromToPublicEntityData (data) {
      return data.map(item => ({
        ...applyFromToCommonData(item.fields),
        publicEntity: item.fields.publicentity_name,
        product: item.fields.publicentity_product,
        contact: item.fields.publicentity_contact,
        contactDate: applyConvertDateToLocale(item.fields.publicentity_contact_date),
        meeting: item.fields.publicentity_meeting,
        meetingDate: applyConvertDateToLocale(item.fields.publicentity_meeting_date)
      }))
    }

    function applyFromToRiskData (data) {
      return data.map(item => ({
        ...applyFromToCommonData(item.fields),
        descricao: item.fields.risk_description,
        tipo: item.fields.risk_type,
        probabilidade: item.fields.risk_probability,
        impacto: item.fields.risk_impact,
        acao: item.fields.risk_action,
        recomedacao: item.fields.risk_recommendation
      }))
    }

    function applyFromToStakeholderData (data) {
      return data.map(item => ({
        ...applyFromToCommonData(item.fields),
        nome: item.fields.stakeholder_name,
        papel: item.fields.stakeholder_role,
        influencia: item.fields.stakeholder_influence,
        interesse: item.fields.stakeholder_interest,
        grauRiscorecomedacao: item.fields.stakeholder_degree_risk,
        definir: item.fields.stakeholder_define,
        planejar: item.fields.stakeholder_plan,
        executar: item.fields.stakeholder_execute,
        revisar: item.fields.stakeholder_review,
        grupo: item.fields.stakeholder_group,
        tipo: item.fields.stakeholder_type,
        acao: item.fields.stakeholder_action
      }))
    }

    function applyFromToTranslationKeyData (data) {
      return data.map(item => ({
        ...applyFromToCommonData(item.fields),
        key: item.fields.translationkey_name,
        value: item.fields.translationkey_value
      }))
    }

    function applyFromToUserData (data) {
      return data.map(item => ({
        ...applyFromToCommonData(item.fields),
        nome: item.fields.user_name,
        filialId: item.fields.user_branch_id,
        filial: item.fields.user_branch_name || '-',
        grupoId: item.fields.user_group_id,
        grupo: item.fields.user_group_name,
        email: item.fields.user_email,
        removerEstatistica: item.fields.userprogress_user_remove_statistics === '1',
        ultimoAcesso: applyConvertDateToLocale(item.fields.user_last_access),
        tentativasProva: item.fields.user_attempts,
        isAtivo: item.fields.user_is_active === '1',
        type: item.fields.user_type
      }))
    }

    function applyFromToUserGroupData (data) {
      return data.map(item => ({
        ...applyFromToCommonData(item.fields),
        nome: item.fields.usergroup_name,
        descricao: item.fields.usergroup_description
      }))
    }

    function applyFromToUserProgressData (data) {
      return data.map(item => ({
        ...applyFromToCommonData(item.fields),
        id: item.fields.userprogress_user_id,
        nome: item.fields.userprogress_user_name,
        email: item.fields.userprogress_user_email,
        type: item.fields.userprogress_user_type,
        ultimoAcesso: item.fields.userprogress_user_last_access,
        grupoId: item.fields.userprogress_group_id,
        grupoNome: item.fields.userprogress_group_name,
        filialId: item.fields.userprogress_branch_id,
        filial: item.fields.userprogress_branch_name || '-',
        secaoId: item.fields.userprogress_section_id,
        secao: item.fields.userprogress_section_name || '-',
        programaId: item.fields.userprogress_program_id,
        programaNome: item.fields.userprogress_program_name,
        programaVersao: item.fields.userprogress_program_version,
        tentativasProva: parseInt(item.fields.userprogress_attemps || '0'),
        progresso: applyParseNumber(item.fields.userprogress_progress),
        nota: applyParseNumber(item.fields.userprogress_exam_percentage)
      }))
    }

    function applyFromToVersioningData (data) {
      return data.map(item => ({
        ...applyFromToCommonData(item.fields),
        nome: item.fields.versioning_name,
        versao: item.fields.versioning_version,
        grupoId: item.fields.versioning_group_id,
        grupo: item.fields.versioning_group_name
      }))
    }

    function applyFromToVideoTrainingData (data) {
      return data.map(item => ({
        ...applyFromToCommonData(item.fields),
        tipo: item.fields.videotraining_type,
        nome: item.fields.videotraining_name,
        versao: item.fields.videotraining_version,
        grupoId: item.fields.videotraining_group_id,
        grupo: item.fields.videotraining_group_name
      }))
    }

    function formatValue (str) {
      // [['pattern', 'result']]
      const defaultStringsToremove = [[/\//g, '*'], [/\*\*/g, '*']]

      if (not(is(String, str))) return str

      return reduce(
        (acc, [pattern, result]) => acc.replace(new RegExp(pattern, 'g'), result),
        str,
        defaultStringsToremove
      )
    }
  }
])
