# Four-point call sequence

Consider a block of code like this:

```
syncThing(1,2,3)

setTimeout(function () {
  console.log('first')
}, 100)

setTimeout(function () {
  console.log('second')

  setTimeout(function () {
    console.log('third')
  }, 100)
}, 200)
```

Annotating the changes in stack state via comments looks something like this:

```
// (main) create
// (main) enter

// (1) create
// (1) enter
syncThing(1,2,3)
// (1) exit
// (1) resolve

// (main) return

// (2) create
setTimeout(function () {
  // (2) enter
  console.log('first')
  // (2) exit
  // (2) resolve
  // (idle #2)
}, 100)

// (3) create
setTimeout(function () {
  // (3) enter
  console.log('second')

  // (4) create
  setTimeout(function () {
    // (4) enter
    console.log('third')
    // (4) exit
    // (4) resolve
    // (3) resolve
    // (main) resolve
  }, 100)

  // (3) exit
  // (idle #3)
}, 200)

// (main) exit
// (idle #1)
```

Chronologically, this corresponds to a synchronous stack like this:

```
(main) create
(main) enter
(1) create
(1) enter      | sync layer
(1) exit       |
(1) resolve
(main) return
(2) create
(3) create
(main) exit
(idle #1) ...
(2) enter      | async layer
(2) exit       |
(2) resolve    |
(idle #2) ...
(3) enter      | async layer
(4) create     |
(3) exit       |
(idle #3) ...  |
(4) enter      | | nested async layer
(4) exit       | |
(4) resolve    | |
(3) resolve    |
(main) resolve
```

There are several possible measurable segments here. What node-traceview currently measures for async events is "create" as "entry" and "enter" as "exit", showing the time between an async thing being queued and when the callback begins to execute.

A different method, which would provide much more detail is to report all four events: create, enter, exit and resolve. Create increments a reference counter at each stack depth to indicate how many async things it has to wait on. Resolve decrements the reference counter and, if no references remain, it will trigger the resolve event on the parent context. This means that each context will receive its resolve event *only* when all nested async calls complete. By tracking all four events, you can see the time from queue to execution start, from execution start to execution end, and from execution end to full stack resolution (and, subsequently, garbage collection eligibility).
