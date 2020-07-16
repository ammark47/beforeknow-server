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
    console.log("declining chat and decrementing currency")
    try {
        const res = await setChatStatusDeclinedAndReturnCustomerToken(parseInt(reviewerId), parseInt(customerId), parseInt(reviewId))
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

const setChatStatusDeclinedAndReturnCustomerToken = async (reviewerId, customerId, reviewId) => {
    return db.tx('declineRequestAndGiveBackToken', async t => {
        await t.none('UPDATE chat SET status = $1 WHERE reviewer_id = $2 AND customer_id = $3 AND review_id = $4 AND status = $5', ['DECLINED', reviewerId, customerId, reviewId, 'PENDING'])
        await t.none('UPDATE users SET chat_currency = chat_currency + 1 FROM chat WHERE users.id = chat.customer_id AND chat.review_id = $1 AND chat.customer_id = $2 AND chat.reviewer_id = $3', [reviewId, customerId, reviewerId])
    })
}