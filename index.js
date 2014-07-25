var EventEmitter = require('events').EventEmitter
var debug = require('debug')('stack')
var inherits = require('inherits')
var IdPool = require('id-pool')

function argsToArray (args) {
  var length = args.length
  var res = []
  var i = 0
  for (; i < length; i++) {
    res[i] = args[i]
  }
  return res
}

// Create an id pool to reserve unique stack ids from
var ids = new IdPool

// Create an event emitter to broadcast stack state changes
var stack = new EventEmitter
module.exports = exports = stack

// Reference table of active stacks
// NOTE: This is mostly used for holding open async stacks
var activeStacks = {}

// Create a child stack and run a function in it
stack.createChild = function (name, id, fn, close) {
  var s = new Stack(name, id, close)
  return s.run(fn)
}

// Sugary simplification of manual createChild method
// NOTE: This is a bit slower due to args conversion and fn.apply
stack.run = function (name, fn) {
  var async = fn.length === 1

  return stack.active.descend(name, function () {
    var close = async && stack.active.holdOpen()
    var id = stack.id

    return fn(function (fn) {
      return function () {
        var args = argsToArray(arguments)
        var ctx = this

        var s = new Stack(name + ' (callback)', id, close)
        return s.run(function () {
          return fn.apply(ctx, arguments)
        })
      }
    })
  })
}

// Apply hint data to the active stack
stack.hint = function (meta) {
  stack.emit('hint', stack.id, meta)
}

// Get the descriptor object for an active stack frame
stack.getActiveStackFrame = function (id) {
  return activeStacks[id]
}

// Traverse the stack tree upward to list stack id inheritance
// NOTE: This is for debugging and will probably be removed
stack.ancestorIds = function (id) {
  var parent = activeStacks[id]
  var ids = []

  ids.push(parent.id)
  while ((parent = stack.getActiveStackFrame(parent.id).parent)) {
    ids.push(parent.id)
  }

  return ids
}

//
// Stack data object
//
stack.Stack = Stack
function Stack (name, parentId, close) {
  this.name = name || '(anonymous)'
  this.id = ids.reserve()
  this.parent = activeStacks[parentId]
  this.pendingCalls = 0
  this.close = close

  debug('constructed stack', this.id)
}

// Descending stacks should hold their parent open until resolution
Stack.prototype.descend = function (name, fn) {
  var s = new Stack(name, this.id, this.holdOpen())
  return s.run(fn)
}

// Enter this stack
Stack.prototype.enter = function () {
  debug('entered stack', this.id, this.name)
  activeStacks[this.id] = this
  stack.active = this
  stack.id = this.id

  stack.emit('enter', this.id)

  // Notify stack tracker of the id change
  if (this.parent) {
    stack.emit('change', this.id, this.parent.id)
  }
}

// Do cleanup when the stack is not longer in-use
Stack.prototype.exit = function () {
  stack.emit('exit', this.id)
  debug('exited sync stack', this.id, this.name)


  // Return to outer stack, if available
  if (this.parent) {
    this.parent.enter()
  }

  // Release this stack, if it has no async children
  if ( ! this.pendingCalls) {
    this.release()
  }
}

// Store some handy meta data to describe
// the activity of the current stack
Stack.prototype.hint = function (meta) {
  stack.emit('hint', this.id, meta)
}

// Helper to enter and exit the stack cleanly
Stack.prototype.run = function (fn) {
  this.enter()
  var ret = fn.call(this)
  this.exit()
  return ret
}

// Used to hold a stack open for some async action
Stack.prototype.holdOpen = function () {
  this.pendingCalls++
  var self = this
  return function () {
    self.pendingCalls--
    if ( ! self.pendingCalls) {
      self.release()
    }
  }
}

// Only release the id and active stack reference
// when the full async stack has resolved
Stack.prototype.release = function () {
  stack.emit('resolve', this.id)
  delete activeStacks[this.id]
  ids.release(this.id)
  debug('exited async stack', this.id, this.name)
  if (this.close) this.close()
}

// Enter top-level stack
var topStack = new Stack('(main)')
topStack.enter()

// Exit the top-level stack after the first tick ends
process.nextTick(function () {
  topStack.exit()
})
