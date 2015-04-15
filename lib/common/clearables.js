import {shim} from '../helper'
import Stack from '../stack'

let ctx = typeof window !== 'undefined' ? window : global

let clearables = [
  'AnimationFrame',
  'Immediate',
  'Interval',
  'Timeout'
]

clearables.forEach(function (type) {
  let pending = {}
  let name = type.toLowerCase()
  let repeat = name === 'interval'
  let startName = type === 'AnimationFrame' ? `request${type}` : `set${type}`

  // Skip functions that don't exist
  if (typeof ctx[startName] !== 'function') {
    return
  }

  shim(ctx, startName, function (real) {
    return function (...args) {
      let layer = Stack.descend()

      // Hint the creation arguments
      if (Stack.oncreatehint) {
        Stack.oncreatehint(startName, args, ctx)
      }

      return layer.run((wrap) => {
        // Lock the layer open artificially
        let unlock = layer.holdOpen()

        // When done, unlock the layer
        let resolve = (clear) => {
          if (repeat && ! clear) return
          layer.exited = true
          delete pending[ret]
          unlock()
        }

        // Wrap callback to hint arguments and resolve
        let fn = args[0]
        args[0] = wrap(function () {
          if (Stack.onenterhint) {
            Stack.onenterhint(args, this)
          }
          let ret = fn.apply(this, arguments)
          resolve(false)
          return ret
        })

        // Run the calling side
        let ret = real.apply(this, args)
        pending[ret] = resolve
        return ret
      })
    }
  })

  shim(ctx, `clear${type}`, function (clear) {
    return function (timer) {
      // Resolve pending timers
      let resolve = pending[timer]
      if (resolve) resolve(true)
      return clear(timer)
    }
  })
})
