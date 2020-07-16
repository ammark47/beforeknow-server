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
    const { customerId, reviewerId, reviewId } = pathParameters
    console.log("getting chat status")
    try {
        const res = await getChatStatus(parseInt(reviewerId), parseInt(customerId), parseInt(reviewId))
        return formatResponse(res)
    } catch (error) {
        console.error(error)
        return formatError(error)
    }
        
  
};


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

const getChatStatus = async (reviewerId, customerId, reviewId) => {
    const status = await db.oneOrNone('SELECT status FROM chat WHERE reviewer_id = $1 AND customer_id = $2 AND review_id = $3', [reviewerId, customerId, reviewId])
    return status || {status: 'DOES NOT EXIST'}
}