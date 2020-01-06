const api = require('express').Router()
const util = require('../src/util')

api.get('/all-auctions', async (req, res) => {
  res.json(await util.getAllSkyblockAuctions(process.env.apiKey))
})

module.exports = api
