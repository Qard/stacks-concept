import {shim,wrapWithHints} from '../helper'
import Stack from '../stack'

module.exports = function () {
  let desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')

  Object.defineProperty(Element.prototype, 'innerHTML', {
    get: desc.get,
    set: function (v) {
      let layer = Stack.descend()
      if (Stack.oncreatehint) {
        Stack.oncreatehint('innerHTML', arguments, this)
      }
      return layer.run(() => {
        return desc.set.call(this, v)
      })
    }
  })
}
