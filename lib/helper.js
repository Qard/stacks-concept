import Stack from './stack'

//
// Safely shim functions that may or may not exist
//
export function shim (target, method, replacer) {
  if (typeof target[method] === 'function') {
    let real = target[method]
    target[method] = replacer(real, method, target)
    target[method]._patchOf = real
  }
}

//
// Find real underlying function
//
export function findReal (fn) {
  let real, next = fn
  while (next = next._patchOf) {
    real = next
  }
  return real
}

//
// Safely unshim functions that may or may not exist
//
export function unshim (target, method) {
  target[method] = findReal(target[method])
}

//
// Wrap a function to propagate context
// NOTE: This is fn first to fit nicely into the shim function above
//
export function wrap (fn, name, i) {
  // Use i to locate callback, searching forward for
  // positive numbers and backward for negative ones
  i = typeof i === 'number' ? i : -1

  return function (...args) {
    let layer = Stack.descend()

    // Find the callback based on positioning index
    let position = i > -1 ? i : args.length + i
    let cb = args[i > -1 ? i : args.length + i]

    // If callback not present at suggested index, assume it's sync
    if (typeof cb !== 'function') {
      return layer.run(() => fn.apply(this, args))
    }

    // Otherwise, trace it as an async callback
    return layer.run((wrap) => {
      // Wrap callback to hint arguments
      args[position] = wrap(function () {
        return cb.apply(this, arguments)
      })

      return fn.apply(this, args)
    })
  }
}

//
// Wrap a function with trace hints
// NOTE: This is fn first to fit nicely into the shim function above
//
export function wrapWithHints (fn, name, i) {
  // Use i to locate callback, searching forward for
  // positive numbers and backward for negative ones
  i = typeof i === 'number' ? i : -1

  return function (...args) {
    let layer = Stack.descend()

    // Send creation hints for method name, arguments and context
    if (Stack.oncreatehint) {
      Stack.oncreatehint(name, args, this)
    }

    // Find the callback based on positioning index
    let position = i > -1 ? i : args.length + i
    let cb = args[i > -1 ? i : args.length + i]

    // If callback not present at suggested index, assume it's sync
    if (typeof cb !== 'function') {
      return layer.run(() => fn.apply(this, args))
    }

    // Otherwise, trace it as an async callback
    return layer.run((wrap) => {
      // Wrap callback to hint arguments
      args[position] = wrap(function () {
        if (Stack.onenterhint) {
          Stack.onenterhint(arguments, this)
        }
        return cb.apply(this, arguments)
      })

      return fn.apply(this, args)
    })
  }
}

//
// Forward a name function from one object to another
//
export function forwardFunction (from, to, name, shouldTrace) {
  shouldTrace = shouldTrace || (() => false)

  // If tracing, change to tracing proxy function
  // Create basic proxy function
  let func = shouldTrace(name)
    ? wrapWithHints(to[name], name)
    : wrap(to[name], name)

  // Apply proxy function to proxy object
  from[name] = (...args) => func.apply(to, args)
}

//
// Forward a named property from one object to another
//
export function forwardProperty (from, to, name, shouldTrace) {
  shouldTrace = shouldTrace || (() => false)

  // If it is a function, proxy the calls
  if (typeof to[name] === 'function') {
    forwardFunction(from, to, name, shouldTrace)
    return
  }

  // Define basic getter/setter
  let get = () => to[name]
  let set = (value) => {
    to[name] = value
  }

  // If tracing, change to tracing setter
  if (shouldTrace(name)) {
    let last

    set = function (value) {
      // Resolve last listener when a new one is set
      if (last) last()

      let layer = Stack.descend()
      last = layer.holdOpen()
      if (Stack.oncreatehint) {
        Stack.oncreatehint(`set ${name}`, [value], this)
      }

      // Wrap callback to hint arguments
      let cb = wrap(function () {
        if (Stack.onenterhint) {
          Stack.onenterhint(arguments, this)
        }
        return value.apply(this, arguments)
      })

      return layer.run(
        (wrap) => to[name] = wrap(cb)
      )
    }
  }

  // Add getter/setter to proxy object
  Object.defineProperty(from, name, { set, get })
}

//
// Export all properties of one object to another
//
export function forwardAllProperties (from, to, shouldTrace) {
  for (let name in to) {
    forwardProperty(from, to, name, shouldTrace)
  }
}
