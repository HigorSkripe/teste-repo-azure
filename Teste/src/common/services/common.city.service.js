import { is, isEmpty, isNil, not } from 'ramda'
import { states, cities } from '../data/cities.data'

angular.module('eticca.common').service('cityService', [citiesService])

function citiesService () {
  return {
    getStates,
    getCities
  }
}

function getStates () {
  return states
}

function getCities (stateCode) {
  try {
    const stateCitites = cities[stateCode]

    if (not(is(Number, stateCode)) || isEmpty(stateCitites) || isNil(stateCitites)) {
      throw new Error()
    }

    return stateCitites.sort((a, b) => a.slug > b.slug)
  } catch (error) {
    return []
  }
}
