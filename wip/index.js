import selector from 'unique-selector'
import {any} from 'input-event-name'
import pinghome from 'ping-home'
import slice from 'sliced'
import Stack from '../'

// TODO: Just exposing this for debugging. Remove this later.
window.Stack = Stack

//
// Build stack tree for debugging
//
let stacks = {}
let current
let next

// At create time, store the id and make a stack map reference to the parent
Stack.oncreate = function (id) {
  stacks[id] = current
  next = id
}

// When the creation hint is received, report layer with context data
Stack.oncreatehint = function (name, args, context) {
  var cls = context.constructor.name
  var data = {
    id: next,
    name: cls + '.' + (name || '(anonymous)'),
    parent: stacks[next],
  }

  parseArgs(data, args)
  parseContext(data, context)

  report('create', data)
}

// Track stack id changes
Stack.onchange = function (id, parentId) {
  current = id
}

// When the enter hint is received, report more context data
Stack.onenterhint = function (args, context) {
  var data = {
    id: current
  }

  parseArgs(data, args, 'exitArguments')
  parseContext(data, context, 'exitContext')

  report('enter', data)
}

// Report layer exits and track stack id change back up
Stack.onexit = function (id) {
  current = stacks[id]
  report('exit', { id })
}

// Report layer resolution and clear stack map reference
Stack.onresolve = function (id) {
  delete stacks[id]
  report('resolve', { id })
}

// Begin tracing the stack now
Stack.init()
current = Stack.top.id

//
// Helpers
//

// Helper to get the signature string of any given function
Object.defineProperty(Function.prototype, 'signature', {
  get() {
    return this.toString().match(/function[^\(]*\([^\)]*\)/).shift() + ' {}'
  }
})

// Just did this to make the typeof check shorter...
function isFn (fn) {
  return typeof fn === 'function'
}

// Serialize JSON with function signatures included
function serialize (data) {
  return JSON.stringify(data, (_, v) => isFn(v) ? v.signature : v)
}

// Serialize arguments
// TODO: Extract data from this and apply directly to reported object?
// SEE: Spec concept documentation
function serializeArguments (args) {
  let ret = slice(args || []).map((arg) => any(arg) || arg)
  try { return serialize(ret) }
  catch (e) { return '(unknown)' }
}

// Attempt to serialize context object to something that can be reported
// TODO: Extract data from this and apply directly to reported object?
// SEE: Spec concept documentation
function serializeContext (ctx) {
  if (ctx instanceof Element) {
    return selector(ctx)
  }
  if (ctx.constructor.name === 'Object') {
    try { return serialize(ctx) } catch (e) {}
  }
  return ctx.constructor.name
}

function parseArgs (data, args, key) {
  key = key || 'arguments'
  data[key] = serializeArguments(args)
}
function parseContext (data, context, key) {
  key = key || 'context'
  data[key] = serializeContext(context)
}

// Report an event
function report (type, data) {
  data.ts = Date.now()
  pinghome('/report/' + type, data)
  console.log('reported', type, data)
}
