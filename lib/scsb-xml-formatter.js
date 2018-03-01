const convert2Scsb = require('convert-2-scsb-module')

// we don't need to fource numberic barcodes
convert2Scsb.parseMrc.nonNumericBarcodesOkay = true

const errors = require('./errors')

/**
 * Given a bib and array of items (both marc-in-json) and a customerCode
 * returns a string representaion of the bib-item tree in scsb xml.
 */
function bibsAndItemsToScsbXml (bibs, items, customerCode = 'NA') {
  // add all the barcodes in with the specificed customercode
  items.forEach((i) => {
    convert2Scsb.parseMrc.barcodes.set(i.barcode, customerCode)
  })

  var scsbXml = []
  var itemCount = 0
  try {
    bibs.forEach(function (bib) {
      var r = convert2Scsb.parseSierraApi2SCSB(bib, items, customerCode)

      itemCount = r.itemCount

      if (r.xml) scsbXml.push(r.xml)
    })
  } catch (e) {
    console.log(e)
  }

  // if there are no items that is it's own use case
  if (itemCount === 0) throw new errors.NoItemsError('No items would be sent to ReCAP')

  if (scsbXml.length === 0) throw new errors.ScsbXmlGenerationError('Error parsing API into SCSB XML')

  return `<?xml version="1.0" ?><bibRecords>${scsbXml.join('\n')}</bibRecords>`
}

module.exports = { bibsAndItemsToScsbXml }
