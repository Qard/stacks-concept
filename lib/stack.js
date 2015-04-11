import argsToArray from 'sliced'
import IdPool from 'id-pool'

// Create an id pool to reserve unique stack ids from
const ids = new IdPool

// Reference table of active stacks
// NOTE: This is mostly used for holding open async stacks
const stacks = {}

let active

export default class Stack {
  constructor (parentId, close) {
    this.id = ids.reserve()
    this.parent = stacks[parentId]
    this.pendingCalls = 0
    this.close = close
    stacks[this.id] = this

    if (Stack.oncreate) {
      Stack.oncreate(this.id)
    }
  }

  // Descending stacks should hold their parent open until resolution
  descend(fn) {
    let s = new Stack(this.id, this.holdOpen())
    return fn ? s.run(fn) : s
  }

  // Enter this stack
  enter() {
    active = this

    if (Stack.onenter) {
      Stack.onenter(this.id)
    }

    // Notify stack tracker of the id change
    if (Stack.onchange && this.parent) {
      Stack.onchange(this.id, this.parent.id)
    }
  }

  // Do cleanup when the stack is not longer in-use
  exit() {
    this.exited = true
    if (Stack.onexit) {
      Stack.onexit(this.id)
    }

    // Return to outer stack, if available
    if (this.async) {
      active = null
    } else if (this.parent) {
      this.parent.enter()
    }

    // Release this stack, if it has no async children
    if ( ! this.pendingCalls) {
      this.release()
    }
  }

  // Helper to enter and exit the stack cleanly
  run(fn) {
    let async = this.async = fn.length === 1
    let self = this

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
  holdOpen() {
    this.pendingCalls++
    return () => {
      this.pendingCalls--
      if ( ! this.pendingCalls && this.exited) {
        this.release()
      }
    }
  }

  // Only release the id and active stack reference
  // when the full async stack has resolved
  release() {
    if (Stack.onresolve) {
      Stack.onresolve(this.id)
    }

    delete stacks[this.id]
    ids.release(this.id)

    if (this.close) {
      this.close()
    }
  }

  // Sugary simplification of descending from active stack
  static descend(fn) {
    return active.descend(fn)
  }

  // Get the descriptor object for an active stack frame
  static getActiveStackFrame() {
    return active
  }

  // Get the descriptor object for an active stack frame
  static getStackFrame(id) {
    return stacks[id]
  }

  // Traverse the stack tree upward to list stack id inheritance
  // NOTE: This is for debugging and will probably be removed
  static ancestorIds(id) {
    let parent = stacks[id]
    let ids = []

    ids.push(parent.id)
    while ((parent = Stack.getStackFrame(parent.id).parent)) {
      ids.push(parent.id)
    }

    return ids
  }
}
