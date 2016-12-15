require('babel-register')
var _ = require('../src/liteutils')

var source = "import chalk from 'chalk'\n" +
  "import * as _ from 'lodash'\n" +
  "import { blah, da, haa } from 'stuff'\n" +
  "console.log(chalk.green(_.isNumber(1)))";

var rx = /^import\s+(.*)\s+from.*['"]$/gm

console.log(source.replace(rx, ''))
console.log('----')

var match = rx.exec(source)
let modules = []
let code = []

while (match) {
  if (match.length > 1) {
    code.push(match[0])
    var ims = match[1].replace(/^{(.*)}$/, '$1').split(',')
    _.forEach(ims, function (v) {
      console.log(v.trim().replace(/.*as\s+(.*)/, '$1'))
    })
  }
  match = rx.exec(source)
}

console.log(code.join('\n'))