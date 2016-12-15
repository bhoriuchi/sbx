
describe('VM', function () {
  it('Should run code and show a return value', function (done) {
    var source = 'var x = 10; return x;'
    var context = { name: 'test1' }
    sbx.vm(source, { context }).then(function (ctx) {
      expect(ctx).to.deep.equal({
        _exception: null,
        _result: 10,
        name: 'test1',
        _stdout: []
      })
      done()
    }).catch(function (err) {
      done(err)
    })
  })

  it('Should allow importing external libraries', function (done) {
    var source = 'var _ = require("lodash"); return _.uniq([1,1,2,2,3,4,5]);'
    let lockdown = false
    sbx.vm(source, { lockdown }).then(function (ctx) {
      expect(ctx).to.deep.equal({
        _exception: null,
        _result: [1,2,3,4,5],
        _stdout: []
      })
      done()
    }).catch(function (err) {
      done(err)
    })
  })

  it('Should be able to return a promise', function (done) {
    var source = 'return new Promise(function (resolve, reject) { resolve(100) });'
    let context = { Promise }
    let lockdown = false
    sbx.vm(source, { context, lockdown }).then(function (ctx) {
      expect(ctx).to.deep.equal({
        _exception: null,
        _result: 100,
        _stdout: []
      })
      done()
    }).catch(function (err) {
      done(err)
    })
  })

  it('Should return context to a callback', function (done) {
    var source = 'var x = 10; return x;'
    var context = { name: 'test1' }
    sbx.vm(source, { context }, function (err, ctx) {
      if (err) return done(err)

      expect(ctx).to.deep.equal({
        _exception: null,
        _result: 10,
        name: 'test1',
        _stdout: []
      })
      done()
    })
  })

  it('Should return errors to a callback', function (done) {
    var source = 'var x = 10; return z;'
    var context = { name: 'test1' }
    sbx.vm(source, { context }, function (err, ctx) {
      if (err) return done()
      done('No error thrown when it should have')
    })
  })

  it('Should timeout with error', function (done) {
    var source = 'while (loop) { loop = true }'
    var context = { loop: true }
    var timeout = 100
    sbx.vm(source, { context, timeout }, function (err, ctx) {
      if (err) return done()
      done('Did not throw a timeout error')
    })
  })

  it('Should transform es6 to es5', function (done) {
    var source = 'let fn = (msg) => msg\nreturn fn(message)'
    var context = { message: 'test' }
    var transform = function (code) {
      var out = babel.transform(code, {
        presets: ['es2015', 'stage-2'],
        plugins: ['transform-runtime']
      }).code
      // console.log(out)
      return out
    }
    sbx.vm(source, { context, transform }, function (err, ctx) {
      if (err) return done('Encountered an error')
      done()
    })
  })

  it('Should support es6 import statements', function (done) {
    var source = 'import _ from \'lodash\'\nlet fn = (msg) => msg\nreturn fn(_.toUpper(message))'
    var context = { message: 'test' }
    var transform = function (code) {
      var out = babel.transform(code, {
        presets: ['es2015', 'stage-2'],
        plugins: ['transform-runtime']
      }).code
      // console.log(out)
      return out
    }
    sbx.vm(source, { context, transform, parseImports: true, lockdown: false }, function (err, ctx) {
      if (err) return done(err)
      if (ctx._result !== 'TEST') return done(new Error('invalid context value'))
      done()
    })
  })
})