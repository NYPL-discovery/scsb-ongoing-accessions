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
      return client.get(url)
        .then((resp) => {
          // Reach into first result to extract bibId:
          if (resp && resp.length >= 0 && resp[0].bibIds && resp[0].bibIds.length >= 0) {
            let bibId = resp[0].bibIds[0]

            // Report ellapsed time
            let ellapsed = (new Date()) - startTime
            logger.debug(`Got bibId ${bibId} by barcode ${barcode}`, { ellapsed })

            return bibId
          } else return Promise.reject(new errors.NotFoundError('Barcode not found'))
        })
    })
  }

  /**
   *  Get bib and items for bibId
   *
   *  @param {string} bibId The bibId to look up.
   *
   *  @returns {array} with exactly two elements:
   *   1. bib object formatted as marc-in-json
   *   2. array of item objects, each formatted as marc-in-json
   */
  getBibAndItemsByBibId (bibId) {
    return this.dataApiClient().then((client) => {
      // Record start time to report `ellapsed` on completion
      let startTime = new Date()

      let urls = [`bibs/sierra-nypl/${bibId}`, `bibs/sierra-nypl/${bibId}/items`]
      return Promise.all(
        urls.map((url) => client.get(url))
      ).then((responses) => {
        let [bib, items] = responses

        if (!bib) throw new errors.NotFoundError('Bib not found')
        if (!items || items.length === 0 || !Array.isArray(items)) throw new errors.NoItemsError('No items found for bib')

        // Report ellapsed time
        let ellapsed = (new Date()) - startTime
        logger.debug(`Got bib and ${items.length} for bibId ${bibId}`, { bib, items, ellapsed })

        return [bib, items]
      })
    })
  }
}

module.exports = DataApi
