import {shim} from '../helper'
import Stack from '../stack'

shim(Array.prototype, 'forEach', function (real) {
  return function (...args) {
    let layer = Stack.descend()
    if (Stack.onhint) {
      Stack.onhint('forEach', args, this)
    }

    return layer.run(
      () => real.apply(this, args)
    )
  }
})
