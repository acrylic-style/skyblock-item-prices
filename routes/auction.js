const router = require('express').Router()
const util = require('../src/util')

router.get('/auction/:id', async (req, res) => {
  const { id } = req.params
  if (!id) {
    res.status(400).json({success: false, message: 'Please specify name.'})
    return
  }
  const auction = (await util.getAllSkyblockAuctions(process.env.apiKey)).filter(auction => auction.uuid === id)[0]
  const item = await util.getFirstItem(auction.item_bytes)
  res.render('auction', { data: { ...auction, item_data: item } })
})

module.exports = router
