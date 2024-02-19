/**
 * Global evs: AVOID THIS
 */
window.setupTranslateKey = () => {
  const auth = JSON.parse(localStorage.getItem('ETICCA.AUTH') || '{}')
  const token = auth?.A0_CLAIMS?.raw?.accessToken
  const alias = auth?.A0_CLAIMS?.actualAlias || window.location.origin?.replace(/http(s|):\/\//, '')?.split('.')[0]

  window.__API_URL = process.env.NODE_ENV === 'development'
    ? 'https://api.v2.eticca.com.br'
    : 'https://api.v2.eticca.com.br'

  const setupI18N = () => {
    const _i18n = new XMLHttpRequest()
    let myArr = []

    try {
      if (!token) {
        throw new Error('has no token')
      }

      _i18n.open('GET', `${window.__API_URL}/chavetraducao`, false)
      _i18n.setRequestHeader('Authorization', `Bearer ${token}`)
      _i18n.setRequestHeader('alias', alias)
      _i18n.send()

      if (_i18n.readyState === 4 && _i18n.status === 200) {
        myArr = JSON.parse(_i18n.responseText)
      }
    } catch (err) {
      console.warn('i18n not available!')
    }

    const chavesFixas = {
      value: {
        '#introducao': 'Introdução',
        '#dashboard': 'Dashboard',
        '#faq': 'FAQ',
        '#mapeamento.stakeholders': 'Mapeamento de StakeHolders',
        '#mapeamento.riscos': 'Mapeamento de Riscos',
        '#pre.registro': 'Pré-Registro',
        '#questoes': 'Questões',
        '#treinamento': 'Treinamento',
        '#usuarios': 'Usuários',
        '#certificacao': 'Certificação',
        '#denuncia': 'Denúncia',
        '#denuncias': 'Denúncias',
        '#denunciante': 'Denunciante',
        '#empresa': 'Empresa',
        '#documentos': 'Documentos',
        '#programas': 'Programas',
        '#repositorio': 'Repositório',
        '#contatoEntidadePublica': 'Contato Entidade P.',

        '#chaves.traducao': 'Chaves de Tradução',
        '#termo.aceite': 'Termo de Aceite',
        '#boas.vindas': 'Boas Vindas (E-mail)',
        '#novo.programa': 'Novo Programa (E-mail)',
        '#codigo.etica': 'Código de Ética',
        '#codigo.conduta': 'Código de Conduta',

        '#tituloportal': 'Portal Compliance',
        '#malfeitor': 'agente(s)',
        '#secao': 'Seção',

        '#app': 'App',
        '#admin': 'Admin'
      }
    }

    window.i18n = (key) => {
      const result = myArr.find((obj) => {
        return obj.key === key
      })
      if (result) {
        return result.value
      } else {
        const isChaveFixa = chavesFixas.value[key]
        if (isChaveFixa) {
          return isChaveFixa
        } else {
          return ('chave ' + key + ' não cadastrada')
        }
      }
    }

    window.datetimepickerTooltips = {
      today: 'Hoje',
      clear: 'Limpar',
      close: 'Fechar',
      selectMonth: 'Selecionar mês',
      prevMonth: 'Mês anterior',
      nextMonth: 'Próximo mês',
      selectYear: 'Selecionar ano',
      prevYear: 'Ano anterior',
      nextYear: 'Próximo ano',
      selectDecade: 'Selecionar década',
      prevDecade: 'Década anterior',
      nextDecade: 'Próxima década',
      prevCentury: 'Século anterior',
      nextCentury: 'Próximo século'
    }
  }

  const setupKeyCodigo = () => {
    const _user = new XMLHttpRequest()
    let user = {}

    if (token) {
      _user.open('GET', `${window.__API_URL}/usuario`, false)
      _user.setRequestHeader('Authorization', `Bearer ${token}`)
      _user.setRequestHeader('alias', alias)
      _user.send()

      if (_user.readyState === 4 && _user.status === 200) {
        user = JSON.parse(_user.responseText)
      }
    }

    let myArr = {
      documentos: []
    }

    if (user && user.id) {
      const _keyCodigo = new XMLHttpRequest()
      _keyCodigo.open('GET', `${window.__API_URL}/programa/documento/ativo?grupoId=${user.grupoId}`, false)
      _keyCodigo.setRequestHeader('Authorization', `Bearer ${token}`)
      _keyCodigo.setRequestHeader('alias', alias)
      _keyCodigo.send()

      if (_keyCodigo.readyState === 4 && _keyCodigo.status === 200) {
        myArr = JSON.parse(_keyCodigo.responseText)
      }
    }

    const chavesFixas = {
      value: {
        intro: 'Introdução',
        codigo_etica: 'Código de Ética',
        codigo_conduta: 'Código de Conduta'
      }
    }

    const getTitle = (key, document, lower) => {
      if (document && document.titulo) {
        return (lower ? document.titulo.toLowerCase() : document.titulo)
      } else {
        const chaveFixa = chavesFixas.value[key]

        if (chaveFixa) {
          return (lower ? chaveFixa.toLowerCase() : chaveFixa)
        } else {
          return ('chave ' + key + ' não cadastrada')
        }
      }
    }

    window.keyCodigo = (key, lower) => {
      const document = (window.documentos || []).find(obj => key === obj.nome)

      if (document) return getTitle(key, document, lower)

      const result = myArr.documentos.find(obj => key === obj.nome)
      return getTitle(key, result, lower)
    }
  }

  setupI18N()
  setupKeyCodigo()
}

window.setupTranslateKey()
