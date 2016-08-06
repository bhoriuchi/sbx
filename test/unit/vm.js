
describe('VM', function () {

  var source1 = 'var x = 10'
  var vars1 = { name: 'test1' }

  it('Should run code', function (done) {
    sbx.vm(source1, vars1).then(function (res) {
      console.log(res)
      done()
    }).catch(function (err) {
      done(err)
    })
  })
})