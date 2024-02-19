import faqContainerTemplate from './common.faq-container.component.html'

const faqContainer = () => {
  const link = (scope) => {
    if (!scope?.list?.length) {
      scope.list = []
    }
  }

  return {
    template: faqContainerTemplate,
    restrict: 'E',
    replace: true,
    scope: {
      list: '=?'
    },
    link
  }
}

angular.module('eticca.common').directive('faqContainer', [faqContainer])
