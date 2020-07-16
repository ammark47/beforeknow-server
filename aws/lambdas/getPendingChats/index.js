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
    const { reviewerId } = pathParameters
    console.log("getting pending chats")
    try {
        const res = await getAllPendingChatRequestsForUser(parseInt(reviewerId))
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

const getAllPendingChatRequestsForUser = async (userId) => {
    return await db.manyOrNone(' \
        SELECT users.name, users.id as customer_id, review.id as review_id, review.product_id, product.product_name, product.small_image \
        FROM chat \
            INNER JOIN users \
                ON chat.customer_id = users.id \
            INNER JOIN review \
                ON chat.review_id = review.id \
            INNER JOIN product \
                ON review.product_id = product.id	\
        WHERE reviewer_id = $1 AND status = $2',
    [userId, 'PENDING'])
}