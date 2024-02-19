const userService = (resource, authService) => {
  const apiUrl = window.__API_URL
  const user = resource(`${apiUrl}/usuario`).get()

  const refresh = (user) => {
    const _user = resource(`${apiUrl}/usuario`).get()
    return user.$promise
      .then(() => _user.$promise)
      .then(async data => {
        await user.refreshNaoConcluidas()

        const programaAtivo = await resource(`${apiUrl}/programa/ativo?grupoId=` + user.grupoId).get().$promise
        data.idProgramaAtivo = programaAtivo.id
        data.programaAtivo = programaAtivo
        data.penultimoAcesso = data.penultimoAcesso || data.ultimoAcesso
        data.penultimoIpAddress = data.penultimoAcesso || '127.0.0.1'

        return data
      })
      .catch((error) => {
        console.error(error)
        return null
      })
  }

  const refreshNaoConcluidas = async () => {
    if (angular.isDefined(user.etapasConcluidas)) {
      const keys = Object.keys(user.etapasConcluidas)

      user.naoConcluidas = []
      user.numEtapasConcluidas = 0
      user.totalEtapas = keys.length

      keys.forEach((key) => {
        if (user.etapasConcluidas[key]) {
          user.numEtapasConcluidas += 1
          return
        }
        user.naoConcluidas.push(key)
      })

      if (angular.isUndefined(user.allSteps)) {
        user.allSteps = resource(`${apiUrl}/treinamento/json`).get({}).$promise
      }

      await user.allSteps
        .then((data) => {
          user.naoConcluidas.sort((a, b) => data.result.indexOf(a) < data.result.indexOf(b))
        })

      if (angular.isDefined(user.tentativasProva)) {
        user.tentativaProvaNaoFinalizada = user.tentativasProva.filter(prova => !prova.horaTerminoCliente)[0]

        user.tentativasProvasFinalizadas = user.tentativasProva.filter(prova => !!prova.horaTerminoCliente)

        user.tentativasProvasFinalizadas.forEach((prova) => {
          const nota = prova.nota / prova.questoes.length * 10
          user.maiorNota = user.maiorNota > nota ? user.maiorNota : nota
        })
      }
    }
  }

  user.$promise
    .then((_data) => {
      user.naoConcluidas = []
      user.maiorNota = -1
      user.numEtapasConcluidas = 0
      user.refreshNaoConcluidas = refreshNaoConcluidas
      user.refreshNaoConcluidas()
      user.refresh = refresh

      // Set the documents to get their titles
      window.documentos = user.documentos

      return resource(`${apiUrl}/programa/ativo?grupoId=` + user.grupoId).get().$promise
        .then((programaAtivo) => {
          user.idProgramaAtivo = programaAtivo.id
          user.programaAtivo = programaAtivo
          user.penultimoAcesso = user.penultimoAcesso || user.ultimoAcesso
          user.penultimoIpAddress = user.penultimoIpAddress || '127.0.0.1'

          return user
        })
    })
    .catch((error) => {
      console.error(error)
      return null
    })

  return user
}

angular.module('eticca.common').factory('userService', [
  '$resource',
  'authService',
  userService
])
