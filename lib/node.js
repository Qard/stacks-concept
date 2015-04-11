import Stack from './stack'
export default Stack

//
// Track top-level stack
//
Stack.init = () => {
  let top = Stack.top = new Stack('(main)')
  process.on('exit', () => top.exit())
  top.enter()
}

//
// Trace through timer functions
//
require('./common/clearables')
