const router = require('express').Router()
const util = require('../src/util')
const minecraft = require('minecraft-data')('1.8.8')

router.get('/auction/:id', async (req, res) => {
  const { id } = req.params
  if (!id) {
    res.status(400).json({success: false, message: 'Please specify name.'})
    return
  }
  const raw = await util.getAllSkyblockAuctions(process.env.apiKey)
  const auction = raw.filter(auction => auction.uuid === id)[0]
  if (!auction) {
    res.status(404).json({success: false, message: 'Couldn\'t find auction!'})
    return
  }
  const auctionsName = raw.filter(a => util.stripColor(a.item_name) === util.stripColor(auction.item_name) && a.end <= Date.now() && a.highest_bid_amount > 0 && a.start > (Date.now()-(1000*60*60*24*30)))
  let nameSum = 0
  auctionsName.forEach(a => nameSum += a.highest_bid_amount)
  const item = await util.getFirstItem(auction.item_bytes)
  const item_name = minecraft.findItemOrBlockById(item.id.value).name
  res.render('auction', {
    data: {
      ...auction,
      item_data: item,
      display_name: item.tag.value.display.value.Name.value,
    },
    item_name,
    avgPrice: Math.round(nameSum/auctionsName.length),
  })
})

module.exports = router
