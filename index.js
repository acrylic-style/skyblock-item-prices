const express = require('express')
const app = express()
const util = require('./src/util')
require('dotenv-safe').config()
const env = process.env
app.set('view engine', 'ejs')

app.get('/all-prices', async (req, res) => {
  res.json(await util.getAllActiveSkyblockAuctions(env.apiKey))
})

app.get('/', async (req, res) => {
  const auctionsRaw = await util.getAllSkyblockAuctions(env.apiKey)
  const auctions = await util.getAllActiveSkyblockAuctions(env.apiKey)
  const auctionsFiltered = []
  const auctionsMap = {}
  const auctionsMapRaw = {}
  let allAuctions = {}
  auctions.forEach(auction => {
    if (!allAuctions[util.stripColor(auction.item_name)]) allAuctions[util.stripColor(auction.item_name)] = 0
    allAuctions[util.stripColor(auction.item_name)] = allAuctions[util.stripColor(auction.item_name)] + 1
  })
  const auctionsSum = Object.values(allAuctions).reduce((a, b) => a + b)
  auctions.filter(auction => auction.bids.length > 0).forEach(auction => {
    if (!auctionsMap[util.stripColor(auction.item_name)]) auctionsMap[util.stripColor(auction.item_name)] = []
    auctionsMap[util.stripColor(auction.item_name)].push(auction.highest_bid_amount)
  })
  let sum = 0
  let highestBid = 0
  let lowestBid = Number.MAX_VALUE
  Object.keys(auctionsMap).forEach(key => {
    if (auctionsMap[key].length !== 0) {
      auctionsMap[key].forEach(bid => {
        sum += bid
        if (highestBid < bid) highestBid = bid
        if (lowestBid > bid && bid >= 1) lowestBid = bid
      })
      auctionsFiltered.push({ displayName: key, sellPrice: Math.round(sum/auctionsMap[key].length), highestBid, lowestBid, auctions: allAuctions[key] })
    }
    sum = 0
    highestBid = 0
    lowestBid = Number.MAX_VALUE
  })
  const auctions2 = []
  allAuctions = {}
  auctionsRaw.forEach(auction => {
    if (!allAuctions[util.stripColor(auction.item_name)]) allAuctions[util.stripColor(auction.item_name)] = 0
    allAuctions[util.stripColor(auction.item_name)] = allAuctions[util.stripColor(auction.item_name)] + 1
  })
  auctionsRaw.filter(auction => auction.bids.length > 0).forEach(auction => {
    if (auctionsMapRaw[util.stripColor(auction.item_name)] == null) auctionsMapRaw[util.stripColor(auction.item_name)] = []
    auctionsMapRaw[util.stripColor(auction.item_name)].push(auction.highest_bid_amount)
  })
  Object.keys(auctionsMapRaw).forEach(key => {
    if (auctionsMapRaw[key].length > 0) {
      auctionsMapRaw[key].forEach(bid => {
        sum += bid
        if (highestBid < bid) highestBid = bid
        if (lowestBid > bid && bid >= 1) lowestBid = bid
      })
      auctions2.push({ displayName: key, sellPrice: Math.round(sum/auctionsMapRaw[key].length), highestBid, lowestBid, auctions: allAuctions[key] })
    }
    sum = 0
    highestBid = 0
    lowestBid = Number.MAX_VALUE
  })
  res.render('index', {
    auctions: auctionsFiltered,
    auctionsRaw: auctions2,
    auctionsCount: auctionsSum,
    auctionsRawCount: Object.values(allAuctions).reduce((a, b) => a + b),
  })
})

app.listen(env.listenPort)
console.log('Web server is ready!')
