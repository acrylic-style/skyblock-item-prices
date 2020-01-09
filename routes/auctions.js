const router = require('express').Router()
const util = require('../src/util')

router.get('/auctions/:name', async (req, res, next) => {
  const { name } = req.params
  if (!name) {
    res.status(400).json({success: false, message: 'Please specify name.'})
    return
  }
  const auctionsRaw = (await util.getAllSkyblockAuctions(process.env.apiKey)).filter(auction => util.stripColor(auction.item_name) === name)
  const auctions = (await util.getAllActiveSkyblockAuctions(process.env.apiKey)).filter(auction => util.stripColor(auction.item_name) === name)
  const auctionsFiltered = []
  let allAuctions = auctions.length
  const finalAllAuctions = allAuctions
  for (let i = 0; i < auctions.length; i++) {
    const auction = auctions[i]
    const item = await util.getFirstItem(auction.item_bytes)
    const item_amount = item.Count.value
    const bid = auction.highest_bid_amount
    auctionsFiltered.push({
      displayName: `${auction.item_name} (x${item_amount})`,
      auctionId: auction.uuid,
      currentBid: bid,
      bids: auction.bids.length,
      end: auction.end < Date.now() ? 'N/A' : util.dateDiff(Date.now(), auction.end),
    })
  }
  const auctions2 = []
  allAuctions = auctionsRaw.length
  for (let i = 0; i < auctionsRaw.length; i++) {
    const auction = auctionsRaw[i]
    const item = await util.getFirstItem(auction.item_bytes)
    const item_amount = item.Count.value
    const bid = auction.highest_bid_amount
    auctions2.push({
      displayName: `${auction.item_name} (x${item_amount})`,
      auctionId: auction.uuid,
      currentBid: bid,
      bids: auction.bids.length,
      end: auction.end < Date.now() ? 'N/A' : util.dateDiff(Date.now(), auction.end),
    })
  }
  res.render('auctions', {
    auctions: auctionsFiltered,
    auctionsRaw: auctions2,
    auctionsCount: finalAllAuctions,
    auctionsRawCount: allAuctions,
    name,
  })
  next()
})

module.exports = router
