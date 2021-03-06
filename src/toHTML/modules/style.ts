
import assign = require('object-assign')
import forOwn = require('lodash.forown')
import escape = require('lodash.escape')
import kebabCase = require('lodash.kebabcase')

// data.style

module.exports = function styleModule (vnode, attributes) {
  var values = []
  var style = vnode.data.style || {}

  // merge in `delayed` properties
  if (style.delayed) {
    assign(style, style.delayed)
  }

  forOwn(style, function (value, key) {
    // omit hook objects
    if (typeof value === 'string' || typeof value === 'number') {
      var kebabKey = kebabCase(key)
      values.push((key.match(/^--.*/) ? '--' + kebabKey : kebabKey) + ': ' + escape(value))
    }
  })

  if (values.length) {
    attributes.set('style', values.join('; '))
  }
}
