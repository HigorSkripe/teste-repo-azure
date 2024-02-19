const cpfCnpjFilter = () => {
  return (val) => {
    let strVal = String(val).replace(/[^0-9]/g, '')
    if (strVal.length === 11) {
      strVal = strVal.substr(0, 3) + '.' + strVal.substr(3, 3) + '.' + strVal.substr(6, 3) + '-' + strVal.substr(9, 2)
    } else if (strVal.length === 14) {
      strVal = strVal.substr(0, 2) + '.' + strVal.substr(2, 3) + '.' + strVal.substr(5, 3) + '/' + strVal.substr(8, 4) + '-' + strVal.substr(12, 2)
    }
    return strVal
  }
}

angular.module('eticca.common').filter('cpfCnpj', [cpfCnpjFilter])
