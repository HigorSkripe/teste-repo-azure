import videoangularTheme from 'videogular-themes-default/videogular.css'
import videoTreinamentoTemplate from './common.video-treinamento.component.html'

const sidebarLeft = ($sce, $timeout) => {
  const link = (scope) => {
    const next = () => {
      const _next = _index + 1
      if (_next < _videos.length) {
        setVideo(_next)
      }
    }

    const prev = () => {
      const _prev = _index - 1
      if (_prev < 0 || _videos.length === 0) { return }
      setVideo(_prev)
    }

    const setVideo = (index) => {
      if (_index === index) { return }
      scope.videoApi.stop()
      _index = index
      scope.videoControlsOpt.active = _index
      scope.videoConfig.sources = [_videos[_index]]
      $timeout(scope.videoApi.play.bind(scope.videoApi), 100)
    }

    // Error if not have parameter
    if (angular.isUndefined(scope.videos) || !scope.videos) {
      throw new Error('"videos" não definido!')
    }
    if (!(scope.videos instanceof Array)) {
      throw new Error('"videos" não é um array!')
    }
    const _videos = scope.videos
      .map((video) => {
        return { src: $sce.trustAsResourceUrl(video), type: 'video/mp4' }
      })
    let _index = 0
    scope.videoApi = null
    scope.onPlayerReady = (API) => {
      scope.videoApi = API
    }
    scope.videoConfig = {
      sources: _videos.length ? [_videos[_index]] : [],
      tracks: [],
      theme: videoangularTheme,
      plugins: {
        // poster: "http://www.videogular.com/assets/images/videogular.png"
      }
    }

    scope.videoControlsOpt = {
      pages: new Array(_videos.length).fill(null).map((_, i) => i),
      next: next,
      prev: prev,
      setVideoIndex: setVideo,
      active: _index
    }
  }

  return {
    template: videoTreinamentoTemplate,
    restrict: 'E',
    replace: true,
    scope: {
      videos: '=',
      toggleFn: '=?'
    },
    link
  }
}

angular.module('eticca.common').directive('videoTreinamento', [
  '$sce',
  '$timeout',
  sidebarLeft
])
