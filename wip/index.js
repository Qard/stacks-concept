var win = typeof window !== 'undefined' ? window : global

var jenga = win.Stack = require('../')

//
// Build stack tree for debugging
//
var stacks = {}
var current = win.mainStack = {
  id: jenga.top.id,
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
  console.log('created', next)
}

jenga.onhint = function (name, args) {
  newStack.name = name || '(anonymous)'
  newStack.arguments = args
}

jenga.onchange = function (id, parentId) {
  current = stacks[id]
  console.log('changed to', current, 'from', stacks[parentId])
}

jenga.onexit = function () {
  console.log('exited', current)
  current = current.parent
}
