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
    const chatInfo = JSON.parse(event.body)
    console.log("inserting new chat request and decrementing currency")
    try {
        const res = await insertNewChatRequestAndDecrementCurrency(chatInfo)
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

const insertNewChatRequestAndDecrementCurrency = async (chatInfo) => {
    return db.tx('insertRequestAndDecrement', async t => {
        await t.none('INSERT INTO chat(customer_id, reviewer_id, status, review_id) VALUES (${customerId}, ${reviewerId}, ${status}, ${reviewId})', {...chatInfo, status: 'PENDING'} )
        await t.none('UPDATE users SET chat_currency = chat_currency - 1 WHERE id = ${customerId}', chatInfo)
    })
}