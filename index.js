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
stack.createChild = function (id, fn, close) {
  var s = new Stack(id, close)
  return s.run(fn)
}

// Sugary simplification of manual createChild method
stack.run = function (fn) {
  var async = fn.length === 1
  var close = async && stack.active.holdOpen()
  var id = stack.id

  fn(function (fn) {
    return function () {
      var args = argsToArray(arguments)
      var ctx = this
      var ret

      stack.createChild(id, function () {
        ret = fn.apply(ctx, arguments)
      }, close)

      return ret
    }
  })
}

// Apply hint data to the active stack
stack.hint = function (name, meta) {
  stack.emit('hint', stack.id, name, meta)
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
function Stack (parentId, close) {
  this.id = ids.reserve()
  this.parent = activeStacks[parentId]
  this.pendingCalls = 0
  this.close = close

  debug('constructed stack', this.id)
}

// Enter this stack
Stack.prototype.enter = function () {
  debug('entered stack', this.id)
  activeStacks[this.id] = this
  stack.active = this
  stack.id = this.id

  stack.emit('enter', this.id)

  // Notify stack tracker of the id change
  if (this.parent) {
    stack.emit('change', this.id, this.parent.id)

    // // Hold parent open while this stack remains open
    // this.parent.pendingCalls++
  }
}

// Do cleanup when the stack is not longer in-use
Stack.prototype.exit = function () {
  stack.emit('exit', this.id)
  debug('exited sync stack', this.id)


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
Stack.prototype.hint = function (name, meta) {
  stack.emit('hint', this.id, name, meta)
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
  debug('exited async stack', this.id)
  if (this.close) this.close()
}

// Enter top-level stack
var topStack = new Stack
topStack.enter()

// Exit the top-level stack at process exit
process.on('exit', function () {
  topStack.release()
})
