import {shim,forwardAllProperties,forwardProperty,forwardFunction,wrapWithHints} from '../helper'
import Stack from '../stack'

let methods = {}

let matchOnSetters = (name) => /^on/.test(name)

let eventTargetMethods = [
  'addEventListener',
  'removeEventListener',
  'dispatchEvent'
]

let xhrMethods = [
  'abort',
  'getAllResponseHeaders',
  'getResponseHeader',
  'open',
  'overrideMimeType',
  'send',
  'setRequestHeader'
]

let xhrProperties = [
  'readyState',
  'response',
  'responseText',
  'responseType',
  'responseXML',
  'status',
  'statusText',
  'timeout',
  'upload',
  'withCredentials'
]

let setters = [
  'onabort',
  'onerror',
  'onload',
  'onloadstart',
  'onprogress',
  'ontimeout',
  'onloadend'
]

// NOTE: We are storing these *before* the EventTarget patches are applied
eventTargetMethods.forEach((name) => {
  methods[name] = XMLHttpRequest.prototype[name]
})

// Apply patches
module.exports = function () {
  shim(window, 'XMLHttpRequest', function (Real) {
    function XMLHttpRequest () {
      this.pending = []
      this._real = new Real()
      this._real.onloadend = this._real_load_end
    }

    // Keep track of what potentially unreachable listeners
    // are waiting for events, and clean them up at completion
    XMLHttpRequest.prototype._real_load_end = function () {
      this.pending.forEach((resolve) => resolve())
    }

    // Pretend to be the real constructor
    XMLHttpRequest.prototype.constructor = Real

    // Forward all functions, as expected
    let prt = Real.prototype
    for (let prop in prt) {
      if (typeof prt[prop] !== 'function') {
        XMLHttpRequest.prototype[prop] = prt[prop]
        continue
      }

      XMLHttpRequest.prototype[prop] = function () {
        return this._real[prop].apply(this._real, arguments)
      }
    }

    // Setters and getters need to be forwarded explicitly
    setters.forEach((setter) => {
      Object.defineProperty(XMLHttpRequest.prototype, setter, {
        get: function () {
          return this._real[setter]
        },
        set: function (cb) {
          let layer = Stack.descend()
          let real_load_end = this._real_load_end.bind(this)

          // Send creation hints for method name, arguments and context
          if (Stack.oncreatehint) {
            Stack.oncreatehint(setter, arguments, this)
          }

          // Otherwise, trace it as an async callback
          layer.run((wrap) => {
            let resolve = () => {
              this.pending.splice(this.pending.indexOf(resolve), 1)
              layer.exited = true
              layer.close()
            }
            this.pending.push(resolve)

            // Wrap callback to hint arguments
            this._real[setter] = function () {
              layer.enter()
              if (Stack.onenterhint) {
                Stack.onenterhint(arguments, this)
              }

              let ret = cb.apply(this, arguments)
              layer.exit()
              resolve()

              if (setter === 'onloadend') {
                real_load_end()
              }

              return ret
            }
          })
        }
      })
    })

    // Forward read-only properties
    xhrProperties.forEach((prop) => {
      Object.defineProperty(XMLHttpRequest.prototype, prop, {
        get: function () { return this._real[prop] }
      })
    })

    // NOTE: Need to patch over EventTarget patches
    eventTargetMethods.forEach((method) => {
      XMLHttpRequest.prototype[method] = function (...args) {
        let layer = Stack.descend()

        // Send creation hints for method name, arguments and context
        if (Stack.oncreatehint) {
          Stack.oncreatehint(method, args, this)
        }

        // Otherwise, trace it as an async callback
        layer.run((wrap) => {
          let resolve = () => {
            this.pending.splice(this.pending.indexOf(resolve), 1)
            layer.exited = true
            layer.close()
          }
          this.pending.push(resolve)

          // Wrap callback to hint arguments
          shim(args, 1, (cb) => {
            return wrap(function () {
              if (Stack.onenterhint) {
                Stack.onenterhint(arguments, this)
              }
              let ret = cb.apply(this, arguments)
              resolve()
              return ret
            })
          })

          return methods[method].apply(this._real, args)
        })
      }
    })

    return XMLHttpRequest
  })
}
