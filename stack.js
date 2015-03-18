var argsToArray = require('sliced')
var IdPool = require('id-pool')

module.exports = Stack

// Create an id pool to reserve unique stack ids from
var ids = new IdPool

// Reference table of active stacks
// NOTE: This is mostly used for holding open async stacks
Stack.stacks = {}

// Sugary simplification of descending from active stack
Stack.run = function (fn) {
  return Stack.active.descend(fn)
}

// Get the descriptor object for an active stack frame
Stack.getActiveStackFrame = function (id) {
  return Stack.stacks[id]
}

// Traverse the stack tree upward to list stack id inheritance
// NOTE: This is for debugging and will probably be removed
Stack.ancestorIds = function (id) {
  var parent = Stack.stacks[id]
  var ids = []

  ids.push(parent.id)
  while ((parent = Stack.getActiveStackFrame(parent.id).parent)) {
    ids.push(parent.id)
  }

  return ids
}

//
// Stack data object
//
function Stack (parentId, close) {
  this.id = ids.reserve()
  this.parent = Stack.stacks[parentId]
  this.pendingCalls = 0
  this.close = close

  if (Stack.oncreate) {
    Stack.oncreate(this.id)
  }
}

// Descending stacks should hold their parent open until resolution
Stack.prototype.descend = function (fn) {
  var s = new Stack(this.id, this.holdOpen())
  return s.run(fn)
}

// Enter this stack
Stack.prototype.enter = function () {
  Stack.stacks[this.id] = this
  Stack.active = this

  if (Stack.onenter) {
    Stack.onenter(this.id)
  }

  // Notify stack tracker of the id change
  if (Stack.onchange && this.parent) {
    Stack.onchange(this.id, this.parent.id)
  }
}

// Do cleanup when the stack is not longer in-use
Stack.prototype.exit = function () {
  if (Stack.onexit) {
    Stack.onexit(this.id)
  }

  // Return to outer stack, if available
  if (this.async) {
    Stack.active = null
  } else if (this.parent) {
    this.parent.enter()
  }

  // Release this stack, if it has no async children
  if ( ! this.pendingCalls) {
    this.release()
  }
}

// Helper to enter and exit the stack cleanly
Stack.prototype.run = function (fn) {
  var async = this.async = fn.length === 1
  var self = this

  function runner (fn) {
    return function () {
      self.enter()
      var ret = fn.apply(this, arguments)
      self.exit()
      return ret
    }
  }

  return async ? fn(runner) : runner(fn)()
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
  if (Stack.onresolve) {
    Stack.onresolve(this.id)
  }

  delete Stack.stacks[this.id]
  ids.release(this.id)

  if (this.close) {
    this.close()
  }
}
