var win = typeof window !== 'undefined' ? window : global

var jenga = win.Stack = require('../')

//
// Build stack tree for debugging
//
var stacks = {}
var current = win.mainStack = {
  children: {}
}
var newStack = current

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
  console.log('create ' + cls + '.' + newStack.name, newStack)
}

jenga.onenterhint = function (args, context) {
  current.exitArguments = args
  current.exitContext = context

  var ctx = current.context
  if (ctx) {
    var cls = ctx.constructor.name
    console.log('enter ' + cls + '.' + current.name, current)
  }
}

jenga.onchange = function (id, parentId) {
  current = stacks[id]
  // console.log('changed to', id, 'from', parentId)
}

jenga.onexit = function () {
  var ctx = current.context
  if (ctx) {
    var cls = ctx.constructor.name
    console.log('exit ' + cls + '.' + current.name, current)
  }
  current = current.parent
}

jenga.onresolve = function (id) {
  var stack = stacks[id]
  if (stack.context) {
    var cls = stack.context.constructor.name
    console.log('resolve ' + cls + '.' + stack.name, stack)
  }
}

// Begin tracing the stack now
jenga.init()
current.id = jenga.top.id
