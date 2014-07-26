var shimmer = require('shimmer')
var stack = require('..')

var timed = ['setTimeout', 'setInterval']
timed.forEach(function (name) {
  shimmer.wrap(global, name, function (real) {
    return function (fn, ms) {
      return stack.run(name, function (wrap) {
        stack.hint({ length: ms })
        return real(wrap(fn), ms)
      })
    }
  })
})

shimmer.wrap(global, 'setImmediate', function (real) {
  return function (fn, ms) {
    return stack.run('setImmediate', function (wrap) {
      return real(wrap(fn))
    })
  }
})

// // Figure out how to patch nextTick without infinite loops
// shimmer.wrap(process, 'nextTick', function (real) {
//   return function (fn, ms) {
//     return stack.run('process.nextTick', function (wrap) {
//       return real(wrap(fn))
//     })
//   }
// })
