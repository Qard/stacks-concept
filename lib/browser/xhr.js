import {shim,forwardAllProperties,forwardProperty,forwardFunction} from '../helper'
import Stack from '../stack'

let matchOnSetters = (name) => /^on/.test(name)

let eventTargetMethods = [
  'addEventListener',
  'removeEventListener',
  'dispatchEvent'
]

let xhrMethods = [
  'abort',
  'getAllResponseHeaders',
  'getResponseHeader',
  'open',
  'overrideMimeType',
  'send',
  'setRequestHeader'
]

let xhrProperties = [
  'readyState',
  'response',
  'responseText',
  'responseType',
  'responseXML',
  'status',
  'statusText',
  'timeout',
  'upload',
  'withCredentials'
]

let setters = [
  'onabort',
  'onerror',
  'onload',
  'onloadstart',
  'onprogress',
  'ontimeout',
  'onloadend'
]

shim(window, 'XMLHttpRequest', function (Real) {
  function XMLHttpRequest () {
    this._real = new Real()

    // forwardAllProperties(this, this._real, matchOnSetters)

    xhrProperties.forEach((setter) => {
      forwardProperty(this, this._real, setter)
    })

    setters.forEach((setter) => {
      forwardProperty(this, this._real, setter, () => true)
    })

    eventTargetMethods.forEach((method) => {
      forwardFunction(this, this._real, method, () => true)
    })

    xhrMethods.forEach((method) => {
      forwardFunction(this, this._real, method)
    })
  }
  forwardAllProperties(XMLHttpRequest, Real)
  return XMLHttpRequest
})
