require('./index')

var items = [1,2]

items.forEach(function (v) {
  setImmediate(function () {
    setTimeout(function () {
      console.log('a')
    }, v * 1000)
  })
})

setImmediate(function () {
  setTimeout(function () {
    items.forEach(console.log.bind(console, 'forEach inner'))
    items.forEach(console.log.bind(console, 'forEach inner'))
    console.log(Stack.ancestorIds(Stack.active.id))
    console.log('b')
  }, 1000)
})
