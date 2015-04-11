import {shim} from '../helper'
import Stack from '../stack'

let methods = [
  'addEventListener',
  'removeEventListener'
]

let targets = window.EventTarget ? ['EventTarget'] : [
  'ApplicationCache',
  'EventSource',
  'FileReader',
  'InputMethodContext',
  'MediaController',
  'MessagePort',
  'Node',
  'Performance',
  'SVGElementInstance',
  'SharedWorker',
  'TextTrack',
  'TextTrackCue',
  'TextTrackList',
  'WebKitNamedFlow',
  'Window',
  'Worker',
  'WorkerGlobalScope',
  'XMLHttpRequestEventTarget',
  'XMLHttpRequestUpload'
]

for (let i = 0, l = targets.length; i < l; ++i) {
  patch(targets[i])
}

function patch (target) {
  if ( ! window[target]) {
    return
  }

  let proto = window[target].prototype
  for (let i = 0, l = methods.length; i < l; ++i) {
    shim(proto, methods[i], replacer)
  }
}

function replacer (real, name) {
  return function (...args) {
    let layer = Stack.descend()

    // NOTE: this.constructor.name is used rather than target
    // as this will properly point to subclass names
    if (Stack.onhint) {
      Stack.onhint(this.constructor.name + '.' + name, args, this)
    }

    return layer.run((wrap) => {
      args.push(wrap(args.pop()))
      return real.apply(this, args)
    })
  }
}
