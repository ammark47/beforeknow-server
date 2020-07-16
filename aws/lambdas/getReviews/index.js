const pgp = require('pg-promise')()

let connection = {
    host: process.env.proxyendpoint,
    port: process.env.DB_PORT,
    database: process.env.DB,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
}

const db = pgp(connection)

exports.handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false
    const { pathParameters } = event
    const { productId } = pathParameters
    console.log("getting reviews")
    try {
        const res = await getReviewersFromProductId(parseInt(productId))
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

const getReviewersFromProductId = async (productId) => {
    try {
        const reviewerAndUserInfo = await db.any('SELECT review.id, review.product_id, review.user_id, review.review_text, users.name, review.rating FROM review JOIN users ON users.id = review.user_id WHERE product_id = $1', [productId])
        return reviewerAndUserInfo
    } catch (e) {
        console.log('error', e)
        return e
    }
}