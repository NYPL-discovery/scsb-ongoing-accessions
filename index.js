'use strict'
////////////////////////////////////
// "Environment Variables"
process.env["environment"]="development";
process.env["SIERRA_KEY"]="";
process.env["SIERRA_SECRET"]="";
process.env["SIERRA_BASE"]="https://nypl-sierra-test.iii.com/iii/sierra-api/v4/";
////////////////////////////////////


const mockData = require('./data/mock.json')
const request = require('request')
const convert2Scsb = require('convert-2-scsb-module')
const wrapper = require('sierra-wrapper')

// we don't need to fource numberic barcodes
convert2Scsb.parseMrc.nonNumericBarcodesOkay = true

console.log('Loading function')

exports.handler = (event, context, callback) => {
  // console.log('Received event:', JSON.stringify(event, null, 2))

  if ((!event || !event.queryStringParameters || (!event.queryStringParameters.barcode || !event.queryStringParameters.customercode)) && (!event.queryStringParameters.bnumber || !event.queryStringParameters.customercode)) {
    context.succeed({
      statusCode: '400',
      body: JSON.stringify({ error: 'Missing barcode and customercode paramaters or bnumber and customercode paramater' }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
    return false
  }

  // if they pass a barcode check if it is a mock barcode, if not use shadowcat to try and fufill the SCSB conversion
  if (!event.queryStringParameters.bnumber && false) {
    // these are the mock barcodes they gave us to hook into some mock MARC records they provided
    // if it is one of these test barcodes just return the data they want in the SCSB format
    if (mockData[event.queryStringParameters.barcode]) {
      context.succeed({
        statusCode: '200',
        body: `<?xml version="1.0" ?><bibRecords>${mockData[event.queryStringParameters.barcode].join('\n')}</bibRecords>`,
        headers: {
          'Content-Type': 'application/xml',
          'Access-Control-Allow-Origin': '*'
        }
      })
    } else {
      // it is not one of the mock barcodes lets try to get the data from API
      request(`http://45.55.205.23/api/barcode/${event.queryStringParameters.barcode}`, function (error, response, body) {
        if (!error && response.statusCode !== 200) {
          context.succeed({
            statusCode: '500',
            body: JSON.stringify({ error: 'Error talking to remote API' }),
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          })
        }
        if (error) {
          context.succeed({
            statusCode: '500',
            body: JSON.stringify({ error: 'Error connecting to remote API' }),
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          })
        }

        if (response.statusCode === 200) {
          var apiResults = JSON.parse(body)
          if (!apiResults.item || !apiResults.bib) {
            context.succeed({
              statusCode: '404',
              body: JSON.stringify({ error: 'Barcode not found' }),
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            })
          } else {
            // we have all the data to make it a SCSB format
            // load in the barcode
            convert2Scsb.parseMrc.barcodes.set(event.queryStringParameters.barcode, event.queryStringParameters.customercode)
            var scsbXml = []

            // there could be bound with items in multiple bibs
            apiResults.bib.forEach((bib) => {
              try {
                var r = convert2Scsb.parseSierraApi2SCSB(bib, [apiResults.item])
                if (r.xml) scsbXml.push(r.xml)
              } catch (e) {
                console.log(e)
              }
            })
            // if there are results
            if (scsbXml.length > 0) {
              context.succeed({
                statusCode: '200',
                body: `<?xml version="1.0" ?><bibRecords>${scsbXml.join('\n')}</bibRecords>`,
                headers: {
                  'Content-Type': 'application/xml',
                  'Access-Control-Allow-Origin': '*'
                }
              })
            } else {
              context.succeed({
                statusCode: '500',
                body: JSON.stringify({ error: 'Error parsing API into SCSB XML' }),
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                }
              })
            }

            // callback(null, 'Okay') // Echo back the first key value
          }
        }
      })
    }
  } else {
    request('https://api.nypltech.org/api/v0.1/items-temp?barcode=' + event.queryStringParameters.barcode, function (error, response, body) {
      event.queryStringParameters.bnumber = JSON.parse(body).data[0].bibIds[0]

      // they passed a bnumber, so we need to talk to prod sierra to do our transformation
      //event.queryStringParameters.bnumber = event.queryStringParameters.bnumber.toString().replace(/\.|b|B/g, '').substr(0, 8)

      wrapper.credsKey = process.env.SIERRA_KEY
      wrapper.credsSecret = process.env.SIERRA_SECRET
      wrapper.credsBase = process.env.SIERRA_BASE

      wrapper.auth((errorAuth, results) => {
        if (errorAuth) {
          context.succeed({
            statusCode: '500',
            body: JSON.stringify({ error: 'Error with Sierra auth' }),
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          })
        }

        wrapper.requestSingleBib(event.queryStringParameters.bnumber, (errorBibReq, bibResults) => {
          if (errorBibReq) {
            context.succeed({
              statusCode: '500',
              body: JSON.stringify({ error: 'Error retriving bib' }),
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            })
          }

          wrapper.requestBibItems(event.queryStringParameters.bnumber, (errorItemReq, itemResults) => {
            if (errorItemReq) {
              context.succeed({
                statusCode: '500',
                body: JSON.stringify({ error: 'Error retriving items' }),
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                }
              })
            }

            // add all the barcodes in with the specificed customercode
            itemResults.data.entries.forEach((i) => {
              convert2Scsb.parseMrc.barcodes.set(i.barcode, event.queryStringParameters.customercode)
            })

            var scsbXml = []
            var itemCount = 0
            try {
              var r = convert2Scsb.parseSierraApi2SCSB(bibResults.data.entries[0], itemResults.data.entries)
              itemCount = itemCount + r.itemCount
              if (r.xml) scsbXml.push(r.xml)
            } catch (e) {
              console.log(e)
            }

            // if there are no items that is it's own use case
            if (itemCount === 0) {
              context.succeed({
                statusCode: '500',
                body: JSON.stringify({error: 'No items would be sent to ReCAP', itemData: itemResults.data.entries}, null, 2),
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                }
              })
            }

            // if there are results
            if (scsbXml.length > 0) {
              context.succeed({
                statusCode: '200',
                body: `<?xml version="1.0" ?><bibRecords>${scsbXml.join('\n')}</bibRecords>`,
                headers: {
                  'Content-Type': 'application/xml',
                  'Access-Control-Allow-Origin': '*'
                }
              })
            } else {
              context.succeed({
                statusCode: '500',
                body: JSON.stringify({ error: 'Error parsing API into SCSB XML' }),
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                }
              })
            }
          })
        })
      })
    })


  }
}
