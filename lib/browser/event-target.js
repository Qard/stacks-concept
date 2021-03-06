import {shim,wrapWithHints} from '../helper'
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

module.exports = function () {
  for (let i = 0, l = targets.length; i < l; ++i) {
    patch(targets[i])
  }

  function patch (target) {
    if ( ! window[target]) {
      return
    }

    let proto = window[target].prototype
    for (let i = 0, l = methods.length; i < l; ++i) {
      shim(proto, methods[i], function (fn, name) {
        return wrapWithHints(fn, name, 1)
      })
    }
  }
}
