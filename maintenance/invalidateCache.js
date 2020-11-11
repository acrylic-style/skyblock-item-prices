const cache = require('../src/cache')
const arg = process.argv[2]
if (!arg) return console.error('please specify cache id!')
console.log('loading cache')
cache.loadFile().then(() => {
  console.log('invalidating cache')
  cache.invalidateCache(arg)
  console.log('writing cache to disk')
  cache.save().then(() => console.log(`done, cache '${arg}' has been invalidated.`))
})
