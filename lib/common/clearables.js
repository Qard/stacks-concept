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
      layer.repeatable = repeat
      if (Stack.onhint) {
        Stack.onhint(name, args, this)
      }

      let timer = layer.run((wrap) => {
        let fn = args[0]
        let done = () => delete pending[ret]
        let resolve = wrap(done)

        args[0] = wrap(function () {
          if (Stack.onenterhint) {
            Stack.onenterhint(args, this)
          }
          done()
          return fn.apply(this, arguments)
        })

        let ret = real.apply(this, args)
        pending[ret] = resolve
        return ret
      })

      return timer
    }
  })

  shim(ctx, `clear${type}`, function (clear) {
    return function (timer) {
      let resolve = pending[timer]
      if (resolve) {
        console.log('resolve is', resolve)
        resolve()
      }
      return clear(timer)
    }
  })
})
