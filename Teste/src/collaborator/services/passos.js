const passos = (resource, user) => {
  const apiUrl = window.__API_URL
  const _passos = {
    adicionar: (current) => {
      return user.$promise
        .then((data) => {
          if (data.naoConcluidas.indexOf(current) !== -1) {
            _passos.body = $.extend(_passos.body, { etapa: current })
            return resource(`${apiUrl}/usuario/adicionaretapa`).save({}, _passos.body).$promise
              .then((res) => {
                data.etapasConcluidas = res.etapasConcluidas
                data.refreshNaoConcluidas()
                return data
              })
              .catch((error) => {
                console.error(error)
                data.refreshNaoConcluidas()
                return error
              })
          }
          return data
        })
    },
    body: {}
  }

  return _passos
}

angular.module('eticca.collaborator').factory('passos', [
  '$resource',
  'userService',
  passos
])
