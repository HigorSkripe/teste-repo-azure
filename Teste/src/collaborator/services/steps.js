const steps = (resource) => {
  const apiUrl = window.__API_URL
  const stepsPromise = resource(`${apiUrl}/treinamento/json/:fun/:step`)

  const next = (step) => stepsPromise.get({
    fun: 'next',
    step: step
  }).$promise

  const prev = (step) => stepsPromise.get({
    fun: 'previous',
    step: step
  }).$promise

  const pos = (step) => stepsPromise.get({
    fun: 'position',
    step: step
  }).$promise

  return {
    prev,
    next,
    pos
  }
}

angular.module('eticca.collaborator').factory('steps', [
  '$resource',
  steps
])
