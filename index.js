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

app.get(/.*/, (req, res, next) => {
  util.log(`Access to ${req.path} from ${req.ip}`, util.toMetadata(req))
  next()
})

app.get('/', async (req, res) => {
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
        const bid = auction.highest_bid_amount/item_amount
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
  res.render('index', {
    auctions: auctionsFiltered,
    auctionsRaw: auctions2,
    auctionsCount: auctionsSum,
    auctionsRawCount: Object.values(allAuctions).reduce((a, b) => a + b),
  })
})

app.use('/api', routes.api)

app.use('/', routes.auctions)
app.use('/', routes.auction)

app.listen(env.listenPort, () => {
  logger.info('Web server is ready!')
  util.log('Web server has been started and ready to go.')
})
