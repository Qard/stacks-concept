var win = typeof window !== 'undefined' ? window : global

var jenga = win.Stack = require('../')
var pinghome = require('ping-home')
var slice = require('sliced')
var selector = require('unique-selector')
var inputEventName = require('input-event-name')

//
// Build stack tree for debugging
//
var stacks = {}
var current
var next

// At create time, store the id and make a stack map reference to the parent
jenga.oncreate = function (id) {
  stacks[id] = current
  next = id
}

// When the creation hint is received, report layer with context data
jenga.oncreatehint = function (name, args, context) {
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
jenga.onchange = function (id, parentId) {
  current = id
}

// When the enter hint is received, report more context data
jenga.onenterhint = function (args, context) {
  var data = {
    id: current
  }

  parseArgs(data, args, 'exitArguments')
  parseContext(data, context, 'exitContext')

  report('enter', data)
}

// Report layer exits and track stack id change back up
jenga.onexit = function (id) {
  current = stacks[id]
  report('exit', {
    id: id
  })
}

// Report layer resolution and clear stack map reference
jenga.onresolve = function (id) {
  delete stacks[id]
  report('resolve', {
    id: id
  })
}

// Begin tracing the stack now
jenga.init()
current = jenga.top.id

//
// Helpers
//

// Helper to get the signature string of any given function
Object.defineProperty(Function.prototype, 'signature', {
  get: function () {
    return this.toString().match(/function[^\(]*\([^\)]*\)/).shift() + ' {}'
  }
})

// Serialize JSON with function signatures included
function serialize (data) {
  return JSON.stringify(data, function (_, v) {
    return typeof v === 'function' ? v.signature : v
  })
}

// Serialize arguments
// TODO: Extract data from this and apply directly to reported object?
// SEE: Spec concept documentation
function serializeArguments (args) {
  var ret = slice(args || []).map(function (arg) {
    return inputEventName.any(arg) || arg
  })
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
