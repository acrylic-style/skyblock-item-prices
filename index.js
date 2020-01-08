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
  util.info(logger, `Access to ${req.path} from ${req.ip}`, util.toMetadata(req))
  next()
})

app.get('/', async (req, res) => {
  if (await Cache.exists('routes:/index')) {
    res.render('index', await Cache.getCache('routes:/index'))
    return
  }
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
  auctions.forEach(auction => {
    if (!allAuctions[util.stripColor(auction.item_name)]) allAuctions[util.stripColor(auction.item_name)] = 0
    allAuctions[util.stripColor(auction.item_name)] = allAuctions[util.stripColor(auction.item_name)] + 1
  })
  const auctionsSum = Object.values(allAuctions).reduce((a, b) => a + b)
  auctions.filter(auction => auction.bids.length > 0).forEach(auction => {
    if (!auctionsMap[util.stripColor(auction.item_name)]) auctionsMap[util.stripColor(auction.item_name)] = []
    auctionsMap[util.stripColor(auction.item_name)].push(auction)
  })
  let sum = 0
  let highestBid = 0
  let lowestBid = Number.MAX_VALUE
  const keys = Object.keys(auctionsMap)
  for (let oi = 0; oi < keys.length; oi++) {
    const key = keys[oi]
    if (auctionsMap[key].length !== 0) {
      for (let i = 0; i < auctionsMap[key].length; i++) {
        const auction = auctionsMap[key][i]
        const item = await util.getFirstItem(auction.item_bytes)
        const item_amount = item.Count.value
        const bid = auction.highest_bid_amount/item_amount
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
    lowestBid = Number.MAX_VALUE
  }
  const auctions2 = []
  allAuctions = {}
  auctionsRaw.forEach(auction => {
    if (!allAuctions[util.stripColor(auction.item_name)]) allAuctions[util.stripColor(auction.item_name)] = 0
    allAuctions[util.stripColor(auction.item_name)] = allAuctions[util.stripColor(auction.item_name)] + 1
  })
  auctionsRaw.filter(auction => auction.bids.length > 0).forEach(auction => {
    if (auctionsMapRaw[util.stripColor(auction.item_name)] == null) auctionsMapRaw[util.stripColor(auction.item_name)] = []
    auctionsMapRaw[util.stripColor(auction.item_name)].push(auction)
  })
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
      auctions2.push({
        displayName: key,
        sellPrice: Math.round(sum/auctionsMapRaw[key].filter(auction => auctionsMapRaw[key].filter(auction => (auction.end-Date.now()) <= 1000*60*10).length === 0 || (auction.end-Date.now()) <= 1000*60*10).length),
        highestBid,
        lowestBid,
        auctions: allAuctions[key],
      })
    }
    sum = 0
    highestBid = 0
    lowestBid = Number.MAX_VALUE
  }
  const data = {
    auctions: auctionsFiltered,
    auctionsRaw: auctions2,
    auctionsCount: auctionsSum,
    auctionsRawCount: Object.values(allAuctions).reduce((a, b) => a + b),
  }
  Cache.setCache('routes:/index', data, 1000*60*60) // expires in a hour
  res.render('index', data)
})

app.use('/api', routes.api)

app.use('/', routes.auctions)
app.use('/', routes.auction)

util.info(logger, 'Loading cache...')
Cache.getCacheData().then(data => {
  util.info(logger, `Loaded cache. (${Math.round(JSON.stringify(data).length/1024/1024*100)/100}MB, ${Object.keys(data).length} entries)`)
  process.emit('loadedConfig')
})

setInterval(async () => {
  await Cache.save()
}, 1000*60) // save config every 60 seconds

let exitTrap = false
const exitHandler = async signal => {
  if (!exitTrap) {
    exitTrap = true
    util.info(logger, 'Writing cache to the disk... (Press CTRL+C again to quit)')
    await Cache.save()
    process.kill(process.pid, signal)
  } else process.kill(process.pid, signal)
}

process.on('SIGINT', exitHandler)
process.on('SIGQUIT', exitHandler)
process.on('SIGTSTP', exitHandler)

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
