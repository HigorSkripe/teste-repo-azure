const fileModelDirective = (parse) => {
  const link = (scope, element, attrs) => {
    const model = parse(attrs.fileModel)
    const modelSetter = model.assign
    element.bind('change', () => {
      scope.$apply(() => {
        modelSetter(scope, element[0].files)
      })
    })
  }

  return {
    restrict: 'A',
    link
  }
}

angular.module('eticca.common').directive('fileModel', ['$parse', fileModelDirective])
