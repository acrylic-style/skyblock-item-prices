const express = require('express')
const app = express()
const util = require('./src/util')
const routes = {
  api: require('./routes/api'),
  auctions: require('./routes/auctions'),
  auction: require('./routes/auction'),
}
const { LoggerFactory } = require('logger.js')
const logger = LoggerFactory.getLogger('main', 'blue')
require('dotenv-safe').config({ allowEmptyValues: true })
const env = process.env
app.set('view engine', 'ejs')
require('./src/typedefs')
const Cache = require('./src/cache')

app.get(/.*/, (req, res, next) => {
  util.info(logger, `Processing access to ${req.path} from ${req.ip}`, util.toMetadata(req))
  next()
})

app.get('/', async (req, res, next) => {
  if (Cache.exists('routes:/index')) {
    res.render('index', Cache.getCache('routes:/index'))
    next()
    return
  }
  util.info(logger, 'Rebuilding index!', { why: 'Cache has been expired' })
  const auctionsRaw = await util.getAllSkyblockAuctions(env.apiKey)
  const auctions = await util.getAllActiveSkyblockAuctions(env.apiKey)
  const auctionsFiltered = []
  /**
   * @type {{[name: string]: Auction[]}}
   */
  const auctionsMap = {}
  /**
   * @type {{[name: string]: Auction[]}}
   */
  const auctionsMapRaw = {}
  let allAuctions = {}
  for (let i = 0; i < auctions.length; i++) {
    const auction = auctions[i]
    const item = await util.getFirstItem(auction.item_bytes)
    const name = item.tag.value.display.value.Name.value
    if (!allAuctions[name]) allAuctions[name] = 0
    allAuctions[name] = allAuctions[name] + 1
  }
  const auctionsSum = Object.values(allAuctions).reduce((a, b) => a + b)
  const filtered = auctions.filter(auction => auction.bids.length > 0)
  for (let i = 0; i < filtered.length; i++) {
    const auction = filtered[i]
    const item = await util.getFirstItem(auction.item_bytes)
    const name = item.tag.value.display.value.Name.value
    if (!auctionsMap[name]) auctionsMap[name] = []
    auctionsMap[name].push(auction)
  }
  let sum = 0
  let highestBid = 0
  let lowestBid = Number.MAX_SAFE_INTEGER
  const keys = Object.keys(auctionsMap)
  for (let oi = 0; oi < keys.length; oi++) {
    const key = keys[oi]
    if (auctionsMap[key].length !== 0) {
      for (let i = 0; i < auctionsMap[key].length; i++) {
        const auction = auctionsMap[key][i]
        const item = await util.getFirstItem(auction.item_bytes)
        const item_amount = item.Count.value
        const bid = Math.round(auction.highest_bid_amount/item_amount)
        if (auctionsMap[key].filter(auction => (auction.end-Date.now()) <= 1000*60*10).length === 0 || (auction.end-Date.now()) <= 1000*60*10) sum += bid
        if (highestBid < bid) highestBid = bid
        if (lowestBid > bid && bid > 0) lowestBid = bid
      }
      auctionsFiltered.push({
        displayName: key,
        sellPrice: Math.round(sum/auctionsMap[key].filter(auction => auctionsMap[key].filter(auction => (auction.end-Date.now()) <= 1000*60*10).length === 0 || (auction.end-Date.now()) <= 1000*60*10).length),
        highestBid,
        lowestBid,
        auctions: allAuctions[key],
      })
    }
    sum = 0
    highestBid = 0
    lowestBid = Number.MAX_SAFE_INTEGER
  }
  const auctions2 = []
  allAuctions = {}
  for (let i = 0; i < auctionsRaw.length; i++) {
    const auction = auctionsRaw[i]
    const item = await util.getFirstItem(auction.item_bytes)
    const name = item.tag.value.display.value.Name.value
    if (!allAuctions[name]) allAuctions[name] = 0
    allAuctions[name] = allAuctions[name] + 1
  }
  const filtered2 = auctionsRaw.filter(auction => auction.bids.length > 0)
  for (let i = 0; i < filtered2.length; i++) {
    const auction = filtered2[i]
    const item = await util.getFirstItem(auction.item_bytes)
    const name = item.tag.value.display.value.Name.value
    if (auctionsMapRaw[name] == null) auctionsMapRaw[name] = []
    auctionsMapRaw[name].push(auction)
  }
  const keys2 = Object.keys(auctionsMapRaw)
  for (let oi = 0; oi < keys.length; oi++) {
    const key = keys2[oi]
    if (auctionsMapRaw[key].length !== 0) {
      for (let i = 0; i < auctionsMapRaw[key].length; i++) {
        const auction = auctionsMapRaw[key][i]
        const item = await util.getFirstItem(auction.item_bytes)
        const item_amount = item.Count.value
        const bid = Math.round(auction.highest_bid_amount/item_amount)
        if (auctionsMapRaw[key].filter(auction => (auction.end-Date.now()) <= 1000*60*10).length === 0 || (auction.end-Date.now()) <= 1000*60*10) sum += bid
        if (highestBid < bid) highestBid = bid
        if (lowestBid > bid && bid > 0) lowestBid = bid
      }
      if (lowestBid < Number.MAX_SAFE_INTEGER && highestBid > 0 && sum > 0) {
        auctions2.push({
          displayName: key,
          sellPrice: Math.round(sum/auctionsMapRaw[key].filter(auction => auctionsMapRaw[key].filter(auction => (auction.end-Date.now()) <= 1000*60*10).length === 0 || (auction.end-Date.now()) <= 1000*60*10).length),
          highestBid,
          lowestBid,
          auctions: allAuctions[key],
        })
      }
    }
    sum = 0
    highestBid = 0
    lowestBid = Number.MAX_SAFE_INTEGER
  }
  const data = {
    auctions: auctionsFiltered.sort((a, b) => a.displayName.localeCompare(b.displayName)),
    auctionsRaw: auctions2.sort((a, b) => a.displayName.localeCompare(b.displayName)),
    auctionsCount: auctionsSum,
    auctionsRawCount: Object.values(allAuctions).reduce((a, b) => a + b),
  }
  Cache.setCache('routes:/index', data, 1000*60*60) // expires in a hour
  res.render('index', data)
  next()
})

app.use('/api', routes.api)

app.use('/', routes.auctions)
app.use('/', routes.auction)

app.get(/.*/, (req, res, next) => {
  util.info(logger, `Access to ${req.path} from ${req.ip} has been completed.`, util.toMetadata(req))
  next()
})

util.info(logger, 'Loading cache...')
Cache.getCacheData().then(data => {
  util.info(logger, `Loaded cache. (${Math.round(JSON.stringify(data).length/1024/1024*100)/100}MB, ${Object.keys(data).length} entries)`)
  process.emit('loadedConfig')
})

setInterval(async () => {
  await Cache.save()
}, 1000*60) // save config every 60 seconds

const exitHandler = async () => {
  util.info(logger, 'Writing cache to the disk... (Press CTRL+C again to quit)')
  await Cache.save()
  process.kill(process.pid, 'SIGINT')
}

process.once('SIGINT', exitHandler)
process.once('SIGQUIT', exitHandler)
process.once('SIGTSTP', exitHandler)

process.on('SIGUSR2', async () => {
  util.info(logger, 'Received SIGUSR2, writing cache to the disk!')
  await Cache.save()
  util.info(logger, 'Done!')
})

process.once('loadedConfig', () => {
  app.listen(env.listenPort, () => {
    util.info(logger, 'Web server has been started and ready to go.')
  })
})
