var chai = global.chai = require('chai')
var expect = global.expect = chai.expect
var sbx = global.sbx = require('../dist/sbx')
var babel = global.babel = require('babel-core')
var _ = global._ = require('lodash')

// import tests
var unitTests = require('./unit')

// run tests
unitTests()