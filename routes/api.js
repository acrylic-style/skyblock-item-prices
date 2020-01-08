const api = require('express').Router()
const util = require('../src/util')

api.get('/all-auctions', async (req, res, next) => {
  res.json(await util.getAllSkyblockAuctions(process.env.apiKey))
  next()
})

module.exports = api
