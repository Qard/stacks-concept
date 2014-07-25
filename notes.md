# Things we want

### Stack linkage across async boundaries

This is a major issue for us. The current approach of monkey-patching every
async call in JS is fragile, slow and prone to leaks.

##### Notes

- For each jump to JS, assign unique stack id and link parent id, if available
- For each jump to async C++, store stack id to link to in callback stack
- JS API
  - Get current and parent stack id
  - Manual linking for old code that does not link stacks automatically

##### Proposal

```
// Implement continuation-local-storage equivalent
var contexts = {}

stack.on('change', function (id, parentId) {
	// Make context object that inherits from upper stack context
	if ( ! contexts[id]) {
		contexts[id] = {}
		contexts[id].__proto__ = context[parentId]
	}

	stack.context = contexts[id]
})

stack.on('resolved', function (id) {
	delete contexts[id]
})

var id = stack.getId()
contexts[id] = {}
stack.context = contexts[id]

// Use it
stack.context.path = 'some/file.js'

fs.readFile(stack.context.path, function (err, data) {
	if (err) return fail(err)
	console.log(stack.context.path, 'contains', data)
})
```

Because the async fs.readFile(...) occurred within the outer stack, it is not
resolved until the readFile callback stack resolves. Nothing async occurs within
the readFile callback stack, so it resolve immediately after the sync tick ends.

Also, I'd like to see a manual method of generating a new identified stack.

```
stack.createChild(id, function () {
	// has new stack id, linking to supplied id
})
```

Note that id is supplied manually. The reasoning for this is to allow callbacks
that get pulled out-of-band in JS to retain linkage. Connection pooling, for
example, may execute the callback from a completely unrelated stack in module
internals.

##### Implementation

I have put together a basic sample implementation [here](https://gist.github.com/Qard/a9c3e43743c2790158ad)

### Hinting

- Allow a stack level to provide hints about what it is doing, for anything that
may be listening

```
stack.on('hint', function (id, desc, meta) {
  console.log('stack #' + id + ' is doing ' + desc)
})

http.createServer(function (req, res) {
  stack.hint('http-request', {
    request: req,
    response: res
  })

  // sugar for:
  // stack.emit('hint', stack.getId(), 'http-request', {
  //   request: req,
  //   response: res
  // })
})
```

### Better visibility into streams

- Memory currently being operated on (anomaly detection)
- Memory held due to backpressure (identify slow stream consumers)
- Time spent operating on each chunk (identify slow stream consumers)
- Time spent in stream internals (identify if chunk size needs to increase)

### Disambiguating event emitters

Listening for an event and emitting an event can occur in different execution
stacks. Event callbacks could be wrapped such that, on execution, they create
a new stack, linking back to the stack in which the listening was initiated.
