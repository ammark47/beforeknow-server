const nodeRSA = require('node-rsa')
const fetch = require('node-fetch')

exports.handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false
    const { pathParameters } = event
    const { searchQuery, start } = pathParameters
    console.log("getting walmart products")
    try {
        const res = await getWalmartProducts(searchQuery, start)
        return formatResponse(res)
    } catch (error) {
        console.error(error)
        return formatError(error)
    }
}


var formatResponse = function(body){
    var response = {
        "statusCode": 200,
        "headers": {
        "Content-Type": "application/json"
        },
        "body": JSON.stringify(body)
    }
    return response
}

var formatError = function(error){
    var response = {
        "statusCode": error.statusCode,
        "headers": {
        "Content-Type": "text/plain",
        "x-amzn-ErrorType": error.code
        },
        "isBase64Encoded": false,
        "body": JSON.stringify(error.code + ": " + error.message)
    }
    return response
}

const generateWalmartHeaders = () => {
    const hashList = {
        "WM_CONSUMER.ID": process.env.WALMART_CONSUMER_ID,
        "WM_CONSUMER.INTIMESTAMP": Date.now().toString(),
        "WM_SEC.KEY_VERSION": 1,
    };

    const sortedHashString = `${hashList["WM_CONSUMER.ID"]}\n${hashList["WM_CONSUMER.INTIMESTAMP"]}\n${hashList["WM_SEC.KEY_VERSION"]}\n`;
    const signer = new nodeRSA(process.env.WALMART_PRIVATE_KEY, "pkcs1");
    const signature = signer.sign(sortedHashString);
    const signature_enc = signature.toString("base64");

    return {
        "WM_SEC.AUTH_SIGNATURE": signature_enc,
        "WM_CONSUMER.INTIMESTAMP": hashList["WM_CONSUMER.INTIMESTAMP"],
        "WM_CONSUMER.ID": hashList["WM_CONSUMER.ID"],
        "WM_SEC.KEY_VERSION": hashList["WM_SEC.KEY_VERSION"],
    };
}


const getWalmartProducts = async ( searchQuery, start = 1 ) => {
    const api = `https://developer.api.walmart.com/api-proxy/service/affil/product/v2/search?query=${searchQuery}&start=${start}&numItems=12`
    const options = {
        method: 'GET',
        headers: generateWalmartHeaders()
    }

    const response = await fetch(api, options)
    return await response.json()

}