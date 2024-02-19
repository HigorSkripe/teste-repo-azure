const reCaptchaService = () => {
  return {
    siteKey: process.env.NODE_ENV === 'development'
      ? '6LfsL78UAAAAAPsBAMw-Mg26byOWdGkNifQZOB7F'
      : '6LfsoL8UAAAAALrafyMGKKy9oGRdKZm4milM29Dk'
  }
}


angular.module('eticca.common').service('reCaptchaService', [reCaptchaService])
