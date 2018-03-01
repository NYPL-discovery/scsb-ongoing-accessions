# SCSB Ongoing Accessions Endpoint

This lambda serves the `/api/v0.1/recap/nypl-bibs` endpoint, which takes a `customerCode` and either a `barcode` or a `bnumber` and returns the identified bib and items formatted as SCSB XML.

## Initialization

To initialize a local config to run the lambda:

 * git clone this repo
 * `npm i`
 * `cp config/sample.env config/[environment].env`
 * Fill in the required details in `config/[environment].env` via a co-worker

Note that `NYPL_OAUTH_SECRET` must be encrypted using KMS.

To encrypt a plaintext secret:
 * Look up the account's KMS encryption key ARN:
   * Log into sandbox if you're encrypting a qa key, nypl-digital-dev if you're encrypting a production key
   * IAM > Encryption Keys > lambda-default (or 'lambda-rds' in sandbox)
   * Copy ARN
 * `AWS_DEFAULT_REGION=us-east-1 aws kms encrypt --key-id "[encryption key arn]" --plaintext "[plaintext secret]"`

## Run Locally

To run the endpoint as a standalone express server (bound to port 3000), two different scripts are registered in package.json:

To run against QA dependencies:

`npm run run-qa`

To run against Production dependencies:

`npm run run-production`

## Deploying

### Logging into EC2

Because of the dependencies in this app, we need to run our deployments from EC2. Get the dev team key and EC2 address from a co-worker, then ... 

`ssh -i path/to/dev-team.pem ec2-user@ec.2.add.ress`

Then change to the directory that you will be running the deployment scripts from. 

`cd /home/ec2-user/temp/scsb-ongoing-accessions`

### Important Notes About convert-2-scsb-module

When there are updates to the convert-2-scsb-module, the module will need to be updated by hand. 

### Running Deploy Scripts

Two deploy scripts are registered in `package.json`:

`npm run deploy-[qa|production]`

## Testing

The test suite uses [lambda-tester](https://www.npmjs.com/package/lambda-tester) to run tests against the handler interface.

`npm test`

Note that `event.json` contains a sample API Gateway event that can, in theory, be used with `node-lambda` to emulate a lambda invocation locally, but that won't work until `node-lambda` supports `--profile` due to a quirk in aws global credential management. In practice, running the app as a persistent express server via `npm run run-[environment]` feels more natural for local ad hoc testing anyway.

### Test Fixtures

A series of local test fixtures representing responses from the nypl data api, maintained in `./test/data/*.json`. These allow the test suite to run against a fixed set of data. If any fixtures need to be updated or added, a script is provided:

`node scripts/update-test-fixtures [--all|PATH] --envfile config/[environment].env --profile [aws profile]`

For example, to populate a test fixture for the api response for 'bibs/sierra-nypl/123':

`node scripts/update-test-fixtures bibs/sierra-nypl/123 --envfile config/[environment].env --profile [aws profile]`

To update ALL of the test fixtures:

`node scripts/update-test-fixtures --all --envfile config/[environment].env --profile [aws profile]`
