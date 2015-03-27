var argsToArray = require('sliced')
var Stack = module.exports = require('./stack')

//
// Track top-level stack
//
Stack.init = function () {
  var topStack = Stack.top = new Stack('(main)')
  topStack.enter()

  window.addEventListener('beforeunload', function () {
    topStack.exit()
  })
}

//
// Safely shim functions that may or may not exist
//
function shim (obj, meth, fn) {
  if (typeof obj[meth] === 'function') {
    obj[meth] = fn(obj[meth], meth, obj)
  }
}

//
// Trace through timer functions
//
var timers = [
  'requestAnimationFrame',
  // 'setImmediate',
  // 'setInterval',
  // 'setTimeout'
]

function wrapCallbackFirst (real, name) {
  return function () {
    var args = argsToArray(arguments)
    var self = this

    var layer = Stack.descend()
    if (Stack.onhint) {
      Stack.onhint(name, args)
    }

    return layer.run(function (wrap) {
      args[0] = wrap(args[0])
      return real.apply(self, args)
    })
  }
}

timers.forEach(function (timer) {
  shim(window, timer, wrapCallbackFirst)
})

var clearables = [
  'Immediate',
  'Interval',
  'Timeout'
]

clearables.forEach(function (type) {
  var name = type.toLowerCase()
  var repeat = name === 'interval'

  shim(window, 'set' + type, function (real) {
    return function () {
      var args = argsToArray(arguments)
      var self = this

      var layer = Stack.descend()
      layer.repeatable = repeat
      if (Stack.onhint) {
        Stack.onhint(name, args)
      }

      var timer = layer.run(function (wrap) {
        args[0] = wrap(args[0])
        return real.apply(self, args)
      })

      timer.__layer = layer

      return timer
    }
  })

  shim(window, 'clear' + type, function (clear) {
    return function (timer) {
      var self = this

      function runner () {
        return clear(timer)
      }

      return timer.__layer ? timer.__layer.run(runner) : runner()
    }
  })
})

// Wrap forEach (as a test)
shim(Array.prototype, 'forEach', function (real) {
  return function () {
    var args = argsToArray(arguments)
    var self = this

    var layer = Stack.descend()
    if (Stack.onhint) {
      Stack.onhint('forEach', args)
    }

    return layer.run(function () {
      return real.apply(self, args)
    })
  }
})
