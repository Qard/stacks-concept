import {shim,forwardAllProperties} from '../helper'
import Stack from '../stack'

shim(window, 'XMLHttpRequest', function (Real) {
  function XMLHttpRequest () {
    this._real = new Real()
    forwardAllProperties(this, this._real, (name) => /^on/.test(name))
  }
  forwardAllProperties(XMLHttpRequest, Real)
  return XMLHttpRequest
})
