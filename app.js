const express = require('express')
const cors = require('cors')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const app = express()

const logger = require('./lib/logger')
const errors = require('./lib/errors')
const DataApi = require('./lib/data-api')
const scsbXmlFormatter = require('./lib/scsb-xml-formatter')

const swaggerDocs = require('./swagger.v0.1.json')

app.use(cors())
app.use(awsServerlessExpressMiddleware.eventContext())

const dataApi = new DataApi()

app.get('/docs/recap-bibs', function (req, res) {
  res.send(swaggerDocs)
})

app.get('/api/v0.1/recap/nypl-bibs', (req, res, next) => {
  /**
   * This endpoint requires the following params set:
   *
   *  - customercode AND
   *  - barcode OR bibId
   */

  let customerCode = ''

  // Preserve backward compatibility for lowercase customer code
  if (req.query.customercode) {
    customerCode = req.query.customercode
  } else {
    customerCode = req.query.customerCode
  }

  const barcode = req.query.barcode
  const bibId = req.query.bibId
  const includeFullBibTree = (req.query.includeFullBibTree === 'true')

  if (!customerCode || !(barcode || bibId)) {
    return handleError(new errors.InvalidParameterError('Missing barcode and customerCode paramaters or bibId and customerCode parameter'), req, res)
  }

  let resolveBibIds = null

  if (bibId) {
    resolveBibIds = Promise.resolve(bibId)
  } else {
    resolveBibIds = dataApi.getBibIdsByBarcode(barcode)
  }

  return resolveBibIds
    // Get bib & item records:
    .then((bibIds) => {
      return dataApi.getBibsAndItemsByBibId(bibIds, barcode, includeFullBibTree)
    })
    // BEGIN: TEMPORARY overide to test mixed-bib split
    // Essentially: When barcode is one of the three we're testing, override
    // item and bib ids to emulate "migrating" item out of a mixed bib into a
    // new bib
    // ( https://jira.nypl.org/browse/SCC-1531 )
    .then((bibsAndItems) => {
      let [bibs, items] = bibsAndItems

      // These are the three barcodes recently deleted from UAT:
      const overrideBibItemIdForMixedBibSplitTesting = [
        '33433057523213',
        '33433016121497',
        '33433035102635'
      ]

      if (overrideBibItemIdForMixedBibSplitTesting.indexOf(barcode) >= 0) {
        // Add 999 suffix to item and bib ids:
        items[0].id = `${items[0].id}999`
        items[0].bibIds = items[0].bibIds.map((bibId) => `${bibId}999`)
        bibs[0].id = `${bibs[0].id}999`
      }

      return [bibs, items]
    })
    // END: TEMPORARY overide to test mixed-bib split
    // Format as scsb xml:
    .then((bibsAndItems) => {
      const [bibs, items] = bibsAndItems
      return scsbXmlFormatter.bibsAndItemsToScsbXml(bibs, items, customerCode)
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
    case 'NoItemsError':
      status = 400
      break
    case 'NotFoundError':
      status = 404
      break
    case 'ScsbXmlGenerationError':
    default:
      status = 500
  }

  logger.error('Error processing request', { error: error.message, path: req.path, query: req.query })

  res.status(status).send({ statusCode: status, error: error.message, errorCode: error.name })
}

module.exports = app
