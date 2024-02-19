const storageService = () => {
  const get = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key))
      return value
    } catch (e) {
      return null
    }
  }

  const set = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value))
  }

  const clear = () => {
    localStorage.clear()
  }

  const factory = (masterKey) => {
    return {
      get: (key) => {
        const masterValue = get(masterKey)
        if (masterValue) {
          return masterValue[key] || null
        }
        return null
      },
      set: (key, value) => {
        const masterValue = get(masterKey) || {}
        masterValue[key] = value
        set(masterKey, masterValue)
      },
      clear: () => {
        set(masterKey, {})
      }
    }
  }

  return {
    get,
    set,
    clear,
    factory
  }
}

angular.module('eticca.common').service('storageService', [storageService])
