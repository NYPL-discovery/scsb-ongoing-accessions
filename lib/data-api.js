const NyplClient = require('@nypl/nypl-data-api-client')

const kmsHelper = require('./kms-helper')
const logger = require('./logger')
const errors = require('./errors')

class DataApi {
  /**
   *  Get an instance of the nypl-data-api-client
   */
  dataApiClient () {
    if (!this._client) {
      return kmsHelper.decryptNyplOauthSecret()
        .then((decryptedSecret) => {
          this._client = new NyplClient({
            base_url: process.env.NYPL_API_BASE_URL,
            oauth_key: process.env.NYPL_OAUTH_KEY,
            oauth_secret: decryptedSecret,
            oauth_url: process.env.NYPL_OAUTH_URL
          })
          return this._client
        })
    }

    return Promise.resolve(this._client)
  }

  /**
   *  Get the bibIds associated with the given item barcode
   *
   *  @param {string} barcode The item barcode to look up.
   */
  getBibIdsByBarcode (barcode) {
    // Record start time to report `ellapsed` on completion
    const startTime = new Date()

    const url = `items?barcode=${barcode}&nyplSource=sierra-nypl&limit=1`
    return this.dataApiClient().then((client) => {
      return client.get(url, { cache: false })
        .then((resp) => {
          // Reach into first result to extract bibId:
          if (resp && resp.data && resp.data.length >= 0 && resp.data[0].bibIds && resp.data[0].bibIds.length >= 0) {
            const bibIds = []
            for (const key in resp.data[0].bibIds) {
              bibIds.push(resp.data[0].bibIds[key])
            }
            // Report ellapsed time
            const ellapsed = (new Date()) - startTime
            logger.debug(`Got ${resp.data[0].bibIds.length} bibId(s) from barcode ${barcode}`, { ellapsed })
            return bibIds
          } else {
            logger.error({ message: 'Error calling ' + url, response: resp })
            return Promise.reject(new errors.NotFoundError('Barcode not found in ItemService'))
          }
        })
    })
  }

  /**
   *  Get bib and items for bibId
   *
   *  @param {string} bibId The bibId to look up.
   *  @param {string} barcode The barcode of the item to attach.
   *  @param {boolean} includeFullBibTree Include the full bib tree.
   *
   *  @returns {array} with exactly two elements:
   *   1. bib object formatted as marc-in-json
   *   2. array of item objects, each formatted as marc-in-json
   */
  getBibsAndItemsByBibId (bibIds, barcode, includeFullBibTree) {
    return this.dataApiClient().then((client) => {
      // Record start time to report `elapsed` on completion
      const startTime = new Date()
      const urls = []
      for (const key in bibIds) {
        urls.push(`bibs/sierra-nypl/${bibIds[key]}`)
      }
      if (includeFullBibTree) {
        urls.push(`items?nyplSource=sierra-nypl&bibId=${bibIds[0]}&limit=100000`)
      } else {
        if (barcode) {
          urls.push(`items?nyplSource=sierra-nypl&barcode=${barcode}`)
        } else {
          urls.push(`items?nyplSource=sierra-nypl&bibId=${bibIds[0]}`)
        }
      }
      return Promise.all(
        urls.map((url) => client.get(url, { cache: false }))
      ).then((responses) => {
        const items = []
        if (responses[responses.length - 1].data) {
          const itemArray = responses[responses.length - 1].data
          for (const key in itemArray) {
            items.push(itemArray[key])
          }
        }
        const bib = responses[0]
        const bibs = responses.slice(0, responses.length - 1)
        const bibsArray = []
        const returnArray = []
        if (bibs.length !== 0) {
          for (const k in bibs) {
            bibsArray.push(bibs[k].data)
          }
          returnArray.push(bibsArray)
        } else {
          const bibs = []
          bibs.push(bib)
          returnArray.push(bibs)
        }
        returnArray.push(items)
        if (!bib) throw new errors.NotFoundError('Bib not found')
        if (!items || items.length === 0 || !Array.isArray(items)) throw new errors.NoItemsError('No items found for bib')
        // Report elapsed time
        const elapsed = (new Date()) - startTime
        logger.debug(`Got ${bibs.length} bib(s) and ${items.length} item(s) for bibId ${bibIds[0]}`, { elapsed })
        return returnArray
      })
    })
  }
}

module.exports = DataApi
