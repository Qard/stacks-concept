var debug = require('debug')('stack:test')
var assert = require('assert')
var stack = require('./')

//
// Hack setTimeout to use the async stack interface
//
global.setTimeout = (function (setTimeout) {
  return function (fn, ms) {
    return stack.run(function (wrap) {
      return setTimeout(wrap(fn), ms)
    })
  }
})(global.setTimeout)

//
// Implement continuation-local-storage equivalent
//
var contexts = {}

stack.on('change', function (id, parentId) {
  if ( ! contexts[id]) {
    contexts[id] = Object.create(contexts[parentId] || {})
  }
  stack.context = contexts[id]
})

// Keep stack contexts until async resolution
stack.on('resolve', function (id) {
  delete contexts[id]
})

var id = stack.id
contexts[id] = {}
stack.context = contexts[id]

//
// Try it out
//
stack.context.foo = 'bar'

// Listen for stack hints
// We can stitch these together to form layers
stack.on('hint', function (id, name, meta) {
  var frame = stack.getActiveStackFrame(id)
  frame.name = name
  frame.meta = meta
  // debug('hinted', frame)
})

var count = 10
var nums = []
for (var i = 0; i < count; i++) {
  nums.push(i)
}

function after (n, fn) {
  return function () {
    n--
    if (n === 0) fn()
  }
}

var start = Date.now()
var done = after(count * 2, function () {
  debug('it took ' + (Date.now() - start) + ' ms')
})

// var nums = [1,2,3,4,5,6,7,8,9,10]
nums.forEach(function (i) {
  // Artificially create a stack for each number
  // This is to simulate simultaneous requests
  stack.run(function () {
    assert(stack.context.rand === undefined)
    var rand = Math.ceil(Math.random() * 10)
    stack.context.rand = rand

    // Start a random-length timeout so tests run in non-deterministic order
    // This verifies the stack continuation and context switching works
    setTimeout(function () {
      assert(stack.context.i === undefined)
      stack.context.i = i

      setTimeout(function () {
        stack.hint('timeout', { length: rand })
        assert(stack.context.foo === 'bar')
        assert(stack.context.rand === rand)
        assert(stack.context.i === i)

        // List ancestor ids, in inheritance order
        debug('doubled', i, stack.ancestorIds(stack.id))
        done()
      }, rand * rand)

      setTimeout(function () {
        stack.hint('timeout', { length: rand })
        assert(stack.context.foo === 'bar')
        assert(stack.context.rand === rand)
        assert(stack.context.i === i)

        // List ancestor ids, in inheritance order
        debug('halved', i, stack.ancestorIds(stack.id))
        done()
      }, rand / rand)
    }, rand)
  })
})
