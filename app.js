const express = require('express')
const cors = require('cors')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const app = express()

const logger = require('./lib/logger')
const errors = require('./lib/errors')
const DataApi = require('./lib/data-api')
const scsbXmlFormatter = require('./lib/scsb-xml-formatter')

app.use(cors())
app.use(awsServerlessExpressMiddleware.eventContext())

const dataApi = new DataApi()

app.get('/api/v0.1/recap/nypl-bibs', (req, res, next) => {
  /**
   * This endpoint requires the following params set:
   *
   *  - customercode AND
   *  - barcode OR bnumber
   */

  let customerCode = ''

  // Preserve backward compatibility for lowercase customer code
  if (req.query.customercode) {
    customerCode = req.query.customercode
  } else {
    customerCode = req.query.customerCode
  }

  let barcode = req.query.barcode
  let bnumber = req.query.bnumber

  if (!customerCode || !(barcode || bnumber)) {
    return handleError(new errors.InvalidParameterError('Missing barcode and customercode paramaters or bnumber and customercode paramater'), req, res)
  }

  let resolveBibId = null

  // If bnumber given, we can extract bibId from it:
  if (bnumber) {
    let bibId = bnumber.replace(/^b/, '')
    resolveBibId = Promise.resolve(bibId)

  // Otherwise we'll have to look up bnumber by barcode:
  } else {
    resolveBibId = dataApi.getBibIdByBarcode(barcode)
  }

  return resolveBibId
    // Get bib & item records:
    .then((bibId) => dataApi.getBibAndItemsByBibId(bibId))
    // Format as scsb xml:
    .then((bibAndItems) => {
      let [bib, items] = bibAndItems
      return scsbXmlFormatter.bibAndItemsToScsbXml(bib, items, customerCode)
    })
    // Write response:
    .then((scsbXml) => {
      res.set('Content-Type', 'text/xml')
      res.send(scsbXml)
    })
    .catch((e) => handleError(e, req, res))
})

function handleError (error, req, res) {
  let status = null

  res.set('Content-Type', 'application/json')
  switch (error.name) {
    case 'InvalidParameterError':
      status = 400
      break
    case 'NoItemsError':
    case 'ScsbXmlGenerationError':
    default:
      status = 500
  }

  logger.error('Error processing request', { error: error.message, path: req.path, query: req.query })

  res.status(status).send({ statusCode: status, error: error.message, errorCode: error.name })
}

module.exports = app
