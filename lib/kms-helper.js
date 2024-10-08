const aws = require('aws-sdk')

function decrypt (encrypted) {
  return new Promise((resolve, reject) => {
    // If this is instantiated outside this scope (e.g. line 1 of this file),
    // it may be instantiated before AWS_* env vars are set correctly, causing
    // it to attempt to decrypt the value against the wrong account
    const AWS = require('aws-sdk')

    const kms = new AWS.KMS()

    kms.decrypt({ CiphertextBlob: Buffer.from(encrypted, 'base64') }, (err, data) => {
      if (err) return reject(err)

      const decrypted = data.Plaintext.toString('ascii')
      resolve(decrypted)
    })
  })
}

function decryptNyplOauthSecret () {
  if (!process.env.NYPL_OAUTH_SECRET) throw new Error('Missing NYPL_OAUTH_SECRET env variable; aborting.')

  const encrypted = process.env.NYPL_OAUTH_SECRET
  return decrypt(encrypted)
}

function setProfile (profile) {
  // Set aws creds:
  aws.config.credentials = new aws.SharedIniFileCredentials({
    profile
  })

  // Set aws region:
  const awsSecurity = { region: 'us-east-1' }
  aws.config.update(awsSecurity)
}

module.exports = { decryptNyplOauthSecret, setProfile }
