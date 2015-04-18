let on = window.addEventListener

import Stack from './stack'
export default Stack

//
// Track top-level stack
//
Stack.init = () => {
  var top = Stack.top = new Stack('(main)')
  on.call(window, 'beforeunload', () => top.exit())
  top.enter()
}

var modules = [
  require('./common/clearables'),
  require('./browser/event-target'),
  require('./browser/element'),
  require('./browser/xhr')
]

modules.forEach((mod) => mod())
