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

To run the endpoint as a standalone express server (bound to port 3000), three different scripts are registered in package.json:

To run against environment dependencies:

`npm run run-development` (development)

`npm run run-qa` (qa)

`npm run run-production` (production)

## Deploying

### Logging into EC2 and Setting Things Up

Because of the dependencies in this app, we need to run our deployments from EC2. 

To find the ec2 address, log in to the AWS console, and go to EC2 instances. Look for a recent instance that has a public IP you can access with the dgdvteam.pem (ask a coworker). You will likely want to use the instance's private IP to connect. 

`ssh -i path/to/dgdvteam.pem ec2-user@ec.2.add.ress` 

Then change to the directory that you will be running the deployment scripts from. 

`cd /home/ec2-user/temp`

If this directory doesn't exist, you're in for more fun. Create the temp directory, then cd into it and clone this repo. 

It is possible you may also need to install git. If you do, this should work: 

`sudo yum install git`

After cloning the repo, you should finally be able to 

`cd scsb-ongoing-accessions`

Once cloned, you will need to setup the following: 

* AWS credentials at ~/.aws/credentials (needs two profiles for qa and production deployment, named 'nypl-sandbox' and 'nypl-digital-dev' respectively -- best to get this from a coworker, too. (if you need to upload them from local to aws, use `scp -i path/to-dgdvteam.pem credentials ec2-user@ec.2.add.ress:~/.` then `mv credentials .aws/credentials`)
* nvm via `curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash` ... then reconnect. 
* node 6.10.3 via `nvm install 6.10.3` , then `nvm use 6.10.3`
* copy your appropriate config/environment.env file to the server a la your credentails file. .env files are currently not in source control so need to be manually put in place, as well.

Once that's all in place, `npm install` and you should be good to go with deployment. 

### Important Notes About convert-2-scsb-module

When there are updates to the convert-2-scsb-module, the module will need to be updated by hand. You may need to specify the exact commit / tag from github in order to update it. 

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
