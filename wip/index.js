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

jenga.onhint = function (name, args, context) {
  newStack.name = name || '(anonymous)'
  newStack.arguments = args
  newStack.context = context
  console.log('create', newStack)
}

jenga.onenterhint = function (args, context) {
  current.exitArguments = args
  current.exitContext = context
  console.log('enter', newStack)
}

jenga.onchange = function (id, parentId) {
  current = stacks[id]
  // console.log('changed to', id, 'from', parentId)
}

jenga.onexit = function () {
  console.log('exit', current)
  current = current.parent
}

jenga.onresolve = function (id) {
  console.log('resolve', stacks[id])
}

// Begin tracing the stack now
jenga.init()
current.id = jenga.top.id
