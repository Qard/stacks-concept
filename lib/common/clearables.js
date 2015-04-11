import {shim} from '../helper'
import Stack from '../stack'

let clearables = [
  'AnimationFrame',
  'Immediate',
  'Interval',
  'Timeout'
]

var layers = {}

clearables.forEach(function (type) {
  layers[type] = {}

  let name = type.toLowerCase()
  let repeat = name === 'interval'

  let startName = type === 'AnimationFrame' ? `request${type}` : `set${type}`

  shim(window, startName, function (real) {
    return function (...args) {
      let layer = Stack.descend()
      layer.repeatable = repeat
      if (Stack.onhint) {
        Stack.onhint(name, args)
      }

      let timer = layer.run((wrap) => {
        args[0] = wrap(args[0])
        return real.apply(this, args)
      })

      layers[type][timer] = layer

      return timer
    }
  })

  shim(window, `clear${type}`, function (clear) {
    return function (timer) {
      let layer = layers[type][timer]

      function runner () {
        return clear(timer)
      }

      return layer ? layer.run(runner) : runner()
    }
  })
})
