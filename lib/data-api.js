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
   *  Get the bibId associated with the given item barcode
   *
   *  @param {string} barcode The item barcode to look up.
   */
  getBibIdByBarcode (barcode) {
    // Record start time to report `ellapsed` on completion
    let startTime = new Date()

    let url = `items?barcode=${barcode}&nyplSource=sierra-nypl&limit=1`
    return this.dataApiClient().then((client) => {
      return client.get(url, {cache: false })
        .then((resp) => {
          // Reach into first result to extract bibId:
          if (resp && resp.data.length >= 0 && resp.data[0].bibIds && resp.data[0].bibIds.length >= 0) {
            let bibId = resp.data[0].bibIds[0]

            // Report ellapsed time
            let ellapsed = (new Date()) - startTime
            logger.debug(`Got bibId ${bibId} by barcode ${barcode}`, { ellapsed })

            return bibId
          } else {
            logger.error({'message': 'Error calling ' + url, response: resp})
            return Promise.reject(new errors.NotFoundError('Barcode not found'))
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
  getBibAndItemsByBibId (bibId, barcode, includeFullBibTree) {
    return this.dataApiClient().then((client) => {
      // Record start time to report `elapsed` on completion
      let startTime = new Date()

      let urls = []

      if (includeFullBibTree) {
        urls = [`bibs/sierra-nypl/${bibId}`, `items?nyplSource=sierra-nypl&bibId=${bibId}&limit=100000`]
      } else {
        if (barcode) {
          urls = [`bibs/sierra-nypl/${bibId}`, `items?nyplSource=sierra-nypl&barcode=${barcode}`]
        } else {
          urls = [`bibs/sierra-nypl/${bibId}`, `items?nyplSource=sierra-nypl&bibId=${bibId}`]
        }
      }

      return Promise.all(
        urls.map((url) => client.get(url, { cache: false }))
      ).then((responses) => {
        let [bib, items] = responses

        if (!bib.data) {
          logger.error({'message': 'Error retrieving bib', response: bib})
          throw new errors.NotFoundError('Bib not found')
        }
        if (!items || items.data.length === 0 || !Array.isArray(items.data)) {
          logger.error({'message': 'Error retrieving items', response: items})
          throw new errors.NoItemsError('No items found for bib')
        }

        // Report elapsed time
        let elapsed = (new Date()) - startTime
        logger.debug(`Got bib and ${items.data.length} item(s) for bibId ${bibId}`)

        return [bib.data, items.data]
      })
    })
  }
}

module.exports = DataApi
