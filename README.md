The AWS Lambda for the SCSB ongoing accession end point which transforms Sierra Marc-in-Json format to the SCSB XML format.

To build/test install https://www.npmjs.com/package/node-lambda

Any environmental variables need to be stored in file: deploy.env

Edit event.json to simulate a event and then test with:

`node-lambda run --configFile deploy.env`

When ready to push to AWS you must package the repo:

`node-lambda package --configFile deploy.env`

Because a module depends on libxmljs we have to use the static library that was compiled on an ec2 amazon linux machine, that precompiled module is in ec2-linux-bindings-libxmljs

Once the package is ready (will be in the build directory) you need to replace the libxmljs that was built on your machine and in the .zip with the one found in ec2-linux-bindings-libxmljs. The script `repackage.sh` does this for you, so:

`./repackage.sh`

Will do that replacement and clean up the .zip file ready to be uploaded to AWS lambda.


----

The event.json would look like:

```
{
    "queryStringParameters": {
        "barcode": "NYPLTST67896",
        "customercode": "NA"
    }
}
```