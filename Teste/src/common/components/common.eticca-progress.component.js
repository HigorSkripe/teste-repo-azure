import { indexOf } from 'ramda'

import eticcaProgressTemplate from './common.eticca-progress.component.html'

const eticcaProgress = (location, steps, user, storage) => {
  const progressStorage = storage.factory('_ETICCA_PROGRESS')
  const link = (scope) => {
    const currentRoute = location.path().split('/')[2]

    const positions = [
      'introducao',
      'treinamento',
      'codigoetica',
      'codigoconduta',
      'certificacao',
      'termoaceite'
    ]

    Object.assign(scope, progressStorage.get('scope') || {})
    scope.loading = true

    if (currentRoute) {
      steps.pos(currentRoute)
        .then(async (resp) => {
          await user.$promise
          user.refresh(user)
          scope.position = {}

          if (resp) {
            scope.position.totalPos = resp.total !== null ? resp.total : 0
            scope.position.curPos = resp.cur.pos !== null ? indexOf(resp.cur.pos, positions) + 1 : 0
            scope.position.curName = resp.cur.name ? resp.cur.name : ''
            scope.position.prevName = resp.prev ? resp.prev.name : ''
            scope.position.prevUrl = resp.prev ? '/app/' + resp.prev.route : ''
            scope.position.nextName = resp.next ? resp.next.name : ''
            scope.position.nextUrl = resp.next ? '/app/' + resp.next.route : ''
          }

          user.$promise
            .then((data) => {
              if (scope.position.curPos > user.parouNaEtapa && scope.position.curPos < scope.position.totalPos) {
                const ant = user.parouNaEtapa

                user.parouNaEtapa = user.concluiuProva ? scope.position.curPos : scope.position.curPos - 1

                if (ant === user.parouNaEtapa) {
                  user.parouNaEtapa += 1
                }
              }

              scope.position.atualProgress = scope.position.curPos > user.numEtapasConcluidas ? scope.position.curPos : user.numEtapasConcluidas
              scope.concluiu = user.numEtapasConcluidas === scope.position.totalPos
              scope.progressStyle = {
                width: `${(scope.position.atualProgress / scope.position.totalPos) * 100}%`
              }

              progressStorage.set('scope', {
                position: scope.position,
                concluiu: scope.concluiu,
                progressStyle: scope.progressStyle
              })

              scope.loading = false

              return data
            })
        })
    }
  }

  return {
    restrict: 'E',
    template: eticcaProgressTemplate,
    scope: {
      visible: '='
    },
    link
  }
}

angular.module('eticca.common').directive('eticcaProgress', [
  '$location',
  'steps',
  'userService',
  'storageService',
  eticcaProgress
])
