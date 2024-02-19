const eticcaController = (rootScope, location, crumble) => {
  const completeLoading = () => {
    const $body = $('body')
    const $loader = $('#initial-loader')
    $body.removeClass('loading')
    $loader.remove()
  }

  rootScope.$on('$routeChangeSuccess', () => {
    crumble.update()
    crumble.trail = crumble.trail
      .filter((bc) => bc?.path !== '/' && !!bc?.label?.length > 0)
      .map((bc, i) => {
        bc.active = i === crumble.trail.length - 1 && location.path() === bc.path
        return bc
      })
  })

  completeLoading()
}

angular.module('eticca').controller('eticca', [
  '$rootScope',
  '$location',
  'crumble',
  eticcaController
])
