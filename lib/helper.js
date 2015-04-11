//
// Safely shim functions that may or may not exist
//
export function shim (target, method, replacer) {
  if (typeof target[method] === 'function') {
    target[method] = replacer(target[method], method, target)
  }
}

//
// Forward a name function from one object to another
//
export function forwardFunction (from, to, name, shouldTrace) {
  shouldTrace = shouldTrace || () => false

  // Create basic proxy function
  let func = (...args) => to[name].apply(to, args)

  // If tracing, change to tracing proxy function
  if (shouldTrace(name)) {
    func = (...args) => {
      let layer = Stack.descend()
      if (Stack.onhint) {
        Stack.onhint(`${to.constructor.name}.${name}(...)`, args, this)
      }

      // If this is not a callback-last call, assume it's sync
      if (typeof args[args.length - 1] !== 'function') {
        return layer.run(() => to[name].apply(to, args))
      }

      // Otherwise, trace it as an async callback
      return layer.run((wrap) => {
        args.push(wrap(args.pop()))
        to[name].apply(to, args)
      })
    }
  }

  // Apply proxy function to proxy object
  from[name] = func
}

//
// Forward a named property from one object to another
//
export function forwardProperty (from, to, name, shouldTrace) {
  shouldTrace = shouldTrace || () => false

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
    set = (value) => {
      let layer = Stack.descend()
      if (Stack.onhint) {
        Stack.onhint(`set ${to.constructor.name}.${name}`, [value], this)
      }

      return layer.run(
        (wrap) => to[name] = wrap(value)
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