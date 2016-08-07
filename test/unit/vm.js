
describe('VM', function () {

  it('Should run code and show a return value', function (done) {
    var source = 'var x = 10; return x;'
    var vars = { name: 'test1' }
    sbx.vm(source, vars).then(function (res) {
      expect(res).to.deep.equal({
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
    sbx.vm(source, false).then(function (res) {
      expect(res).to.deep.equal({
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
    var source = 'return new Promise(function (resolve) { resolve(100) });'
    sbx.vm(source, { Promise: Promise }, false).then(function (res) {
      console.log('res', res)
      done()
    }).catch(function (err) {
      done(err)
    })
  })
})