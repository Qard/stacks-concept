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
var current = win.mainStack = {
  children: {}
}
var newStack = current

Object.defineProperty(Function.prototype, 'signature', {
  get: function () {
    return this.toString().match(/function[^\(]*\([^\)]*\)/).shift() + ' {}'
  }
})

function jsonWithFns (data) {
  return JSON.stringify(data, function (_, v) {
    return typeof v === 'function' ? v.signature : v
  })
}

function serializeArguments (args) {
  var ret = slice(args || []).map(function (arg) {
    return inputEventName.any(arg) || arg
  })
  console.log('ret is', ret)
  try { return jsonWithFns(ret) }
  catch (e) { return '(unknown)' }
}

function serializeContext (ctx) {
  if (ctx instanceof Element) {
    return selector(ctx)
  }
  if (ctx.constructor.name === 'Object') {
    return jsonWithFns(ctx)
  }
  return ctx.constructor.name
}

function report (type, data) {
  data.ts = Date.now()
  pinghome('/report/' + type, data)
}

jenga.oncreate = function (id) {
  var next = {
    id: id,
    parent: current,
    children: {}
  }
  current.children[id] = next
  stacks[id] = next
  newStack = next
  // console.log('created', next.id)
}

jenga.oncreatehint = function (name, args, context) {
  newStack.name = name || '(anonymous)'
  newStack.arguments = args
  newStack.context = context
  var cls = context.constructor.name

  report('create', {
    id: newStack.id,
    name: cls + '.' + newStack.name,
    arguments: serializeArguments(args),
    context: serializeContext(context),
    parent: newStack.parent.id,
  })
  // console.log('create ' + cls + '.' + newStack.name, newStack)
}

jenga.onenterhint = function (args, context) {
  current.exitArguments = args
  current.exitContext = context
  report('enter', {
    id: current.id,
    exitArguments: serializeArguments(args),
    exitContext: serializeContext(context),
  })

  // var ctx = current.context
  // if (ctx) {
  //   var cls = ctx.constructor.name
  //   console.log('enter ' + cls + '.' + current.name, current)
  // }
}

jenga.onchange = function (id, parentId) {
  current = stacks[id]
  // console.log('changed to', id, 'from', parentId)
}

jenga.onexit = function () {
  // var ctx = current.context
  // if (ctx) {
  //   var cls = ctx.constructor.name
  //   console.log('exit ' + cls + '.' + current.name, current)
  // }
  report('exit', {
    id: current.id
  })
  current = current.parent
}

jenga.onresolve = function (id) {
  var stack = stacks[id]
  report('resolve', {
    id: id
  })
  // if (stack.context) {
  //   var cls = stack.context.constructor.name
  //   console.log('resolve ' + cls + '.' + stack.name, stack)
  // }
}

// Begin tracing the stack now
jenga.init()
current.id = jenga.top.id
