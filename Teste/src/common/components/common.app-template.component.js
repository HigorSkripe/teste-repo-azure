import appTemplateTemplate from './common.app-template.component.html'

export const APP_REFS = {
  PUBLIC: 'PUBLIC',
  COLLABORATOR: 'COLLABORATOR',
  ADMIN: 'ADMIN'
}

const leftMenuEvent = () => {
  // If window is small enough, enable sidebar push menu
  if ($(window).width() <= 992) {
    $('.row-offcanvas').toggleClass('active')
    $('.left-side').removeClass('collapse-left')
    $('.right-side').removeClass('strech')
    $('.row-offcanvas').toggleClass('relative')
  } else {
    // Else, enable content streching
    $('.left-side').toggleClass('collapse-left')
    $('.right-side').toggleClass('strech')
  }
}

const setCrumbleActive = (scope) => {
  scope.sideBarLeft.menus.some((menu) => {
    if (window.location.pathname.includes(menu.href)) {
      menu.active = true
    }
    return false
  })
}

const buildForCollaborator = (scope, user, logoUrlService, documentService) => {
  scope.headMenu = {
    logo: {
      href: 'app/',
      text: 'Eticca Compliance',
      image: logoUrlService.getUrlLogo()
    },
    user: {
      name: ''
    },
    toggleClick: leftMenuEvent
  }
  scope.sideBarLeft = {
    id: 'leftMenu',
    user: {
      image: {
        class: 'img-circle',
        alt: 'Avatar',
        src: '/resources/avatar.png'
      },
      salutation: 'Olá',
      name: ''
    }
  }

  return Promise.all([user.$promise, documentService.getDocuments()])
    .then(([data, documentos]) => {
      scope.headMenu.user = angular.copy(data)

      scope.sideBarLeft.menus = [
        {
          icon: 'fa fa-dashboard',
          text: documentService.getDocumentTitle('dash', documentos),
          href: 'app/dashboard'
        },
        {
          icon: 'fa fa-pencil-square-o',
          text: documentService.getDocumentTitle('intro', documentos),
          href: 'app/introducao'
        },
        {
          icon: 'fa fa-pencil-square-o',
          text: documentService.getDocumentTitle('treinamento', documentos),
          href: 'app/treinamento'
        },
        {
          icon: 'fa fa-balance-scale',
          text: documentService.getDocumentTitle('codigo_etica', documentos),
          href: 'app/codigoetica'
        },
        {
          icon: 'fa fa-balance-scale',
          text: documentService.getDocumentTitle('codigo_conduta', documentos),
          href: 'app/codigoconduta'
        },
        {
          icon: 'fa fa-file',
          text: documentService.getDocumentTitle('certificacao', documentos),
          href: 'app/certificacao'
        },
        {
          icon: 'fa fa-check',
          text: documentService.getDocumentTitle('termo_aceite', documentos),
          href: 'app/termoaceite'
        },
        {
          icon: 'fa fa-question',
          text: documentService.getDocumentTitle('faq', documentos),
          href: 'app/faq'
        }
      ]

      setCrumbleActive(scope)

      return data
    })
}

const buildForAdmin = (scope, user, logoUrlService) => {
  scope.headMenu = {
    adminPage: true,
    logo: {
      href: 'app/',
      text: 'Eticca Compliance',
      image: logoUrlService.getUrlLogo()
    },
    user: {
      name: '',
      isAdmin: true
    },
    toggleClick: leftMenuEvent
  }
  scope.sideBarLeft = {
    id: 'leftMenu',
    user: {
      image: {
        class: 'img-circle',
        alt: 'Avatar',
        src: '../../assets/img/avatar.png'
      },
      salutation: 'Olá',
      name: ''
    }
  }

  return user.$promise
    .then((data) => {
      scope.headMenu.user = angular.copy(data)

      scope.sideBarLeft.menus = [
        {
          icon: 'fa fa-dashboard',
          text: window.i18n('#dashboard'),
          href: '/admin/dashboard'
        },
        {
          icon: 'fa fa-map',
          text: window.i18n('#mapeamento.stakeholders'),
          href: '/admin/mapeamento-stakeholders',
          isAdmin: true
        },
        {
          icon: 'fa fa-map-o',
          text: window.i18n('#mapeamento.riscos'),
          href: '/admin/mapeamento-riscos',
          isAdmin: true
        },
        {
          icon: 'fa fa-tags',
          text: window.i18n('#pre.registro'),
          href: '/admin/pre-registro'
        },
        {
          icon: 'fa fa-users',
          text: 'Grupo de Usuários',
          href: '/admin/grupo-usuarios'
        },
        {
          icon: 'fa fa-user',
          text: window.i18n('#usuarios'),
          href: '/admin/usuarios'
        },
        {
          icon: 'fa fa-question',
          text: window.i18n('#faq'),
          href: '/admin/faq',
          isAdmin: true
        },
        {
          icon: 'fa fa-bullhorn',
          text: window.i18n('#denuncia'),
          href: '/admin/denuncias',
          isAdmin: true
        },
        {
          icon: 'fa fa-pencil-square-o',
          text: window.i18n('#questoes'),
          href: '/admin/questoes',
          isAdmin: true
        },
        {
          icon: 'fa fa-check-square-o',
          text: window.i18n('#treinamento'),
          href: '/admin/treinamento',
          isAdmin: true
        },
        {
          icon: 'fa fa-picture-o',
          text: window.i18n('#empresa'),
          href: '/admin/empresa',
          isAdmin: true
        },
        {
          icon: 'fa fa-search-plus',
          text: 'Diligência',
          href: '/admin/diligencia',
          isAdmin: true
        },
        {
          icon: 'fa fa-book',
          text: window.i18n('#documentos'),
          href: '/admin/documentos',
          isAdmin: true
        },
        {
          icon: 'fa fa-grav',
          text: window.i18n('#programas'),
          href: '/admin/versao-programa',
          isAdmin: true
        },
        {
          icon: 'fa fa-hashtag',
          text: window.i18n('#chaves.traducao'),
          href: '/admin/chaves-traducao',
          isAdmin: true
        },
        {
          icon: 'fa fa-id-card',
          text: 'Relatório de Clientes',
          href: '/admin/relatorio-clientes',
          isAdmin: true,
          isManager: true
        },
        {
          icon: 'fa fa-cloud',
          text: window.i18n('#repositorio'),
          href: '/admin/repositorio-documentos',
          isAdmin: true
        }
      ]

      setCrumbleActive(scope)

      return data
    })
}

const appTemplate = (rootScope, location, matchmedia, steps, user, logoUrlService, documentService) => {
  const link = async (scope) => {
    switch (scope.appRef) {
      case APP_REFS.COLLABORATOR:
        await buildForCollaborator(scope, user, logoUrlService, documentService)
        break
      case APP_REFS.ADMIN:
        await buildForAdmin(scope, user, logoUrlService)
        break
    }

    /**
     * Activate menu and show submenus
     * @param menu
     * @param hasSubMenu
     */
    const activeMenu = (menu, hasSubMenu) => {
      menu.active = true
      if (hasSubMenu) {
        $('#' + menu._id).children('.treeview-menu').slideDown()
      }
    }

    /**
     * Dismiss menu and hide submenus
     * @param menu
     * @param hasSubMenu
     */
    const removeActive = (menu, hasSubMenu) => {
      if (hasSubMenu) {
        $('#' + menu._id).children('.treeview-menu').slideUp()
      }
      menu.active = false
    }

    /**
     * Enables or disables the menu and show or hide submenus according to the context
     * @param menu
     */
    const clickMenu = (menu) => {
      const actives = scope.sideBarLeft.menus.filter((el) => {
        return !!el.active
      })
      const hasSubMenu = angular.isDefined(menu.subMenus) && !!menu.subMenus.length
      // Se o menu clicado for igual ao ativo
      if (actives.length === 1 && actives[0] === menu) {
        if (hasSubMenu) {
          removeActive(menu, hasSubMenu)
        }
        return
      }
      // Se possui submenu e o atual está ativo simplesmente oculta-os
      if (hasSubMenu && menu.active) {
        removeActive(menu, hasSubMenu)
        return
      }
      // Se possui mais de 1 ativo e o atual clicado possui submenu
      if (actives.length > 1 && hasSubMenu) {
        actives.forEach((ac) => {
          const hasAcSub = angular.isDefined(ac.subMenus)
          if (hasAcSub) {
            removeActive(ac, hasAcSub)
          }
        })
      }
      // Se possui ativos e o atual clicado não possui submenus
      if (actives.length && !hasSubMenu) {
        actives.forEach((ac) => {
          removeActive(ac, angular.isDefined(ac.subMenus))
        })
      }
      activeMenu(menu, hasSubMenu)
      if (matchmedia.isPhone() || matchmedia.isTablet()) {
        scope.toggleFn()
      }
    }

    scope.sideBarLeft.id = angular.isUndefined(scope.sideBarLeft.id) ? 'sideBarLeft' + Math.round(Math.random() * 10) : scope.sideBarLeft.id
    user.$promise
      .then((data) => {
        scope.sideBarLeft.menus = scope.sideBarLeft.menus.map((menu) => {
          const menuCopy = angular.copy(menu)
          menuCopy._id = 'menu_' + Math.round(Math.random() * 1024)

          if (angular.isDefined(menuCopy.subMenus)) {
            menuCopy.subMenus.map((subMenu) => {
              subMenu._id = menu._id + '_subMenu_' + Math.round(Math.random() * 1024)
              return subMenu
            })
          }

          if (angular.isDefined(menuCopy.isManager)) {
            menuCopy._hide = user.isManager ? !user.isManager : true
          } else
          if (angular.isDefined(menuCopy.isAdmin)) {
            menuCopy._hide = !user.isAdmin || false
          } else {
            menuCopy._hide = false
          }

          return menuCopy
        })

        return data
      })

    rootScope.$on('$routeChangeSuccess', () => {
      /**
       * Ativa o menu se o path informado for igual ao acessado no momento
       * @param menu
       * @param _path
       * @returns {boolean}
       */
      const activeByPath = (menu, _path) => {
        const _hasSubMenu = angular.isDefined(menu.subMenus)
        // Se a rota do menu é a mesma acessada no evento ative o menu
        if (_path === location.path()) {
          activeMenu(menu, _hasSubMenu)
          return true
        }
        return false
      }

      scope.sideBarLeft.menus = scope.sideBarLeft.menus.map((menu) => {
        const _hasSubMenu = angular.isDefined(menu.subMenus)
        // If a rota do menu é a mesma acessada no evento ative o menu
        if (activeByPath(menu, menu.href[0] === '/' ? menu.href : '/' + menu.href)) {
          return menu
        }
        if (_hasSubMenu) {
          menu.subMenus = menu.subMenus.map((sm) => {
            activeByPath(menu, sm.href[0] === '/' ? sm.href : '/' + sm.href)
            return sm
          })
        }
        removeActive(menu, _hasSubMenu)
        return menu
      })

      scope.clickMenu = clickMenu
    })

    scope.clickNext = () => {
      steps.next(location.path().split('/')[2])
        .then((resp) => {
          $('html, body').animate({ scrollTop: 0 }, 'slow')
          location.path(`app/${resp.route}`)
        })
    }
  }

  return {
    template: appTemplateTemplate,
    restrict: 'E',
    replace: true,
    transclude: true,
    scope: {
      appRef: '=',
      visibleNextButton: '=',
      showProgress: '='
    },
    link
  }
}

angular.module('eticca.common').directive('appTemplate', [
  '$rootScope',
  '$location',
  'matchmedia',
  'steps',
  'userService',
  'logoUrlService',
  'documentService',
  appTemplate
])
