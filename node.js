var argsToArray = require('sliced')
var Stack = module.exports = require('./stack')

//
// Track top-level stack
//
var topStack = Stack.top = new Stack('(main)')
topStack.enter()

process.on('exit', function () {
  topStack.exit()
})

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
  'setImmediate',
  'setInterval',
  'setTimeout'
]

function wrapCallbackFirst (real, name) {
  return function () {
    var args = argsToArray(arguments)
    var self = this

    return Stack.run(function (wrap) {
      if (Stack.onhint) {
        Stack.onhint(name, args)
      }
      args[0] = wrap(args[0])
      return real.apply(self, args)
    })
  }
}

timers.forEach(function (timer) {
  shim(global, timer, wrapCallbackFirst)
})