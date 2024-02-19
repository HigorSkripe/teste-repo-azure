const urlTraining = () => {
  const auth = JSON.parse(localStorage.getItem('ETICCA.AUTH') || '{}')
  const accessToken = auth?.A0_CLAIMS?.raw.accessToken

  return {
    addAccessToken
  }

  /**
   * @description Get the url from video training
   * @author Douglas Lima
   * @date 2022-04-25
   * @param {Object} videoTraining
   * @returns
   */
  function addAccessToken (videoTraining) {
    if (!videoTraining || videoTraining.tipo !== 'HTML') return ''

    if (Array.isArray(videoTraining.links)) {
      const link = videoTraining.links[0]

      if (!link) return ''

      return `${link}?access_token=${accessToken}`
    }

    return ''
  }
}

angular.module('eticca.common').factory('urlTraining', [
  urlTraining
])
