const LambdaTester = require('lambda-tester')
const sinon = require('sinon')
const path = require('path')
const fs = require('fs')
const xml2js = require('xml2js')

const kmsHelper = require('../lib/kms-helper')
const DataApiClient = require('@nypl/nypl-data-api-client')

const handler = require('../index').handler

// Express opens a bunch of /tmp/server* sockets during tests, so make sure they're closed on exit:
const exitHandler = require('../index').exitHandler
process.on('exit', exitHandler.bind(null, { cleanup: true }))
process.on('SIGINT', exitHandler.bind(null, { exit: true })) // ctrl+c event
process.on('SIGTSTP', exitHandler.bind(null, { exit: true })) // ctrl+v event
process.on('uncaughtException', exitHandler.bind(null, { exit: true }))

describe('Lambda index handler', function () {
  before(function () {
    sinon.stub(kmsHelper, 'decryptNyplOauthSecret').callsFake(function (encrypted) {
      return Promise.resolve('fake decrypted oauth secret')
    })
    sinon.stub(DataApiClient.prototype, 'get').callsFake(function (apiPath) {
      let diskPath = path.join('./test/data/', encodeURIComponent(apiPath)) + '.json'

      // Fail helpfully
      if (!fs.existsSync(diskPath)) {
        console.error(`Fixture not found; Run node ./scripts/update-test-fixtures "${apiPath}" --envfile config/[environment].env`)
        throw new Error('Fixture not found for ' + apiPath)
      }

      return new Promise((resolve, reject) => {
        return fs.readFile(diskPath, 'utf8', (err, data) => {
          if (err) reject(err)
          else resolve(JSON.parse(data))
        })
      })
    })
  })

  after(function () {
    DataApiClient.prototype.get.restore()
  })

  it('should respond with error if customerCode missing', function () {
    return LambdaTester(handler)
      .event({ path: '/api/v0.1/recap/nypl-bibs', queryStringParameters: { barcode: '123' } })
      .expectResult((result) => {
        expect(result.statusCode).to.equal(400)
        let body = JSON.parse(result.body)
        expect(body).to.be.a('object')
        expect(body.errorCode).to.be.a('string')
        expect(body.errorCode).to.equal('InvalidParameterError')
        expect(body.statusCode).to.equal(400)
      })
  })

  it('should respond with error if barcode and bnumber missing', function () {
    return LambdaTester(handler)
      .event({ path: '/api/v0.1/recap/nypl-bibs', queryStringParameters: { customerCode: 'PL' } })
      .expectResult((result) => {
        expect(result.statusCode).to.equal(400)
        let body = JSON.parse(result.body)
        expect(body).to.be.a('object')
        expect(body.errorCode).to.be.a('string')
        expect(body.errorCode).to.equal('InvalidParameterError')
        expect(body.statusCode).to.equal(400)
      })
  })

  it('should respond with correct bib & item if barcode and customerCode given', function () {
    return LambdaTester(handler)
      .event({ path: '/api/v0.1/recap/nypl-bibs', queryStringParameters: { barcode: '33433047331719', customerCode: 'PL' } })
      .expectResult((result) => {
        expect(result.statusCode).to.equal(200)

        return new Promise((resolve, reject) => {
          xml2js.parseString(result.body, function (err, body) {
            if (err) reject(err)

            // Verify structure & content of bib:
            expect(body).to.be.a('object')
            expect(body.bibRecords).to.be.a('object')

            expect(body.bibRecords.bibRecord).to.be.a('array')
            expect(body.bibRecords.bibRecord[0].bib).to.be.a('array')
            expect(body.bibRecords.bibRecord[0].bib[0].owningInstitutionId).to.be.a('array')
            expect(body.bibRecords.bibRecord[0].bib[0].owningInstitutionId).to.contain('NYPL')
            expect(body.bibRecords.bibRecord[0].bib[0].owningInstitutionBibId).to.be.a('array')
            expect(body.bibRecords.bibRecord[0].bib[0].owningInstitutionBibId).to.contain('.b119953456')
            expect(body.bibRecords.bibRecord[0].bib[0].content).to.be.a('array')
            expect(body.bibRecords.bibRecord[0].bib[0].content[0].collection).to.be.a('array')
            expect(body.bibRecords.bibRecord[0].bib[0].content[0].collection[0].record).to.be.a('array')

            let contributorTags = body.bibRecords.bibRecord[0].bib[0].content[0].collection[0].record[0].datafield
              .filter((tag) => tag['$'].tag === '100')
              .map((tag) => {
                // Join all subfield values:
                return tag.subfield
                  .map((subfield) => subfield._)
                  .join(' ')
              })
            expect(contributorTags).to.be.a('array')
            expect(contributorTags[0]).to.equal('Edwards, Joseph, 1946-')

            // Verify structure & content of holdings
            expect(body.bibRecords.bibRecord[0].holdings).to.be.a('array')
            expect(body.bibRecords.bibRecord[0].holdings[0].holding).to.be.a('array')
            expect(body.bibRecords.bibRecord[0].holdings[0].holding[0].content).to.be.a('array')
            expect(body.bibRecords.bibRecord[0].holdings[0].holding[0].content[0].collection).to.be.a('array')
            expect(body.bibRecords.bibRecord[0].holdings[0].holding[0].content[0].collection[0].record).to.be.a('array')
            expect(body.bibRecords.bibRecord[0].holdings[0].holding[0].content[0].collection[0].record[0].datafield).to.be.a('array')

            // Pull 852 $h (callnumber)
            let callnumberTags = body.bibRecords.bibRecord[0].holdings[0].holding[0].content[0].collection[0].record[0].datafield
              .filter((tag) => tag['$'].tag === '852')
              .map((tag) => {
                // Get 'h' subfield value (there's only one)
                return tag.subfield
                  .filter((subfield) => subfield.$.code === 'h')
                  .map((subfield) => subfield._)
                  .join('')
              })
            expect(callnumberTags).to.be.a('array')
            expect(callnumberTags[0]).to.equal('JND 94-72 no. 1')

            // Verify structure and content of items:
            expect(body.bibRecords.bibRecord[0].holdings[0].holding[0].items).to.be.a('array')
            expect(body.bibRecords.bibRecord[0].holdings[0].holding[0].items[0].content).to.be.a('array')
            expect(body.bibRecords.bibRecord[0].holdings[0].holding[0].items[0].content[0].collection).to.be.a('array')
            expect(body.bibRecords.bibRecord[0].holdings[0].holding[0].items[0].content[0].collection[0].record).to.be.a('array')
            expect(body.bibRecords.bibRecord[0].holdings[0].holding[0].items[0].content[0].collection[0].record[0].datafield).to.be.a('array')

            let datafields = body.bibRecords.bibRecord[0].holdings[0].holding[0].items[0].content[0].collection[0].record[0].datafield

            // Map subfield values in 876:
            let subfieldsIn876 = datafields
              .filter((datafield) => datafield.$.tag === '876')[0]
              .subfield
                .reduce((h, subfield) => {
                  h[subfield.$.code] = subfield._
                  return h
                }, {})
            expect(subfieldsIn876['p']).to.equal('33433047331719')
            // expect(subfieldsIn876['h']).to.equal('In Library Use') #TODO: Check to make sure this is correct.
            expect(subfieldsIn876['j']).to.equal('Available')

            // Map subfield values in 900:
            let subfieldsIn900 = datafields
              .filter((datafield) => datafield.$.tag === '900')[0]
              .subfield
                .reduce((h, subfield) => {
                  h[subfield.$.code] = subfield._
                  return h
                }, {})
            // expect(subfieldsIn900['a']).to.equal('Private') #TODO: Check to make sure this is what we want.
            expect(subfieldsIn900['b']).to.equal('PL')

            resolve()
          })
        })
      })
  })
})
