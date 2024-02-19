import fileInputTemplate from './common.file-input.component.html'

const fileInput = (timeout) => {
  const link = (scope, element) => {
    const complete = () => {
      const self = $('#' + scope.params.id)
      timeout(() => {
        self.trigger('fileuploaded', scope.model)
        self.fileinput('clear')
      }, 200)
    }

    if (typeof $ !== 'function') {
      throw new Error('Need jQuery ($)!')
    }
    if (typeof $.fn.fileinput !== 'function') {
      throw new Error('Need jquery plugin file input!')
    }
    scope.multiple = scope.multiple ? Boolean(scope.multiple) : false
    scope.params = scope.params ? scope.params : {}
    scope.params.id = scope.params.id ? scope.params.id : 'file_input_' + Math.round(Math.random() * 124)
    timeout(() => {
      const fileInput = $('#' + scope.params.id)
      const fiOptions = {
        showPreview: scope.params.showPreview || false,
        language: 'pt-BR',
        maxFileSize: 10 * 1024,
        showUpload: typeof scope.params.upload === 'function' || false,
        previewFileType: scope.params.previewFileType || 'any'
      }
      if (scope.multiple) {
        fileInput.attr('multiple', 'multiple')
      }
      if (scope.params.types) {
        fiOptions.allowedFileTypes = scope.params.types
      } else if (scope.params.extensions) {
        fiOptions.allowedFileExtensions = scope.params.extensions
      }
      fileInput.fileinput(fiOptions)
      if (fiOptions.showUpload) {
        $(element).find('button.fileinput-upload').on('click', () => {
          return scope.params.upload(scope.model, complete)
        })
      }
    })
  }

  return {
    template: fileInputTemplate,
    restrict: 'E',
    replace: true,
    scope: {
      multiple: '=?',
      model: '=',
      params: '='
    },
    link
  }
}

angular.module('eticca.common').directive('fileInput', [
  '$timeout',
  fileInput
])
