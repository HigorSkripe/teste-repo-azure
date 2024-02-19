module.exports = {
  getUrl: (endpoint, clientId, responseType, scope, redirectUri) => {
    return `${endpoint}?client_id=${clientId}&response_type=${responseType}&scope=${scope}&redirect_uri=${redirectUri}`
  },
  cognito: {
    grupoish: {
      endpoint: 'https://ish-tecnologia.idp.eticca.app/oauth2/authorize',
      clientId: '6eggjepp5inr9g42ap775ao2l9',
      responseType: 'code',
      scope: 'email+openid+phone+profile',
      tokenField: 'id_token'
    }
  },
  auth0: {}
}
