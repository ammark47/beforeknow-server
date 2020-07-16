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
    console.log("archiving chat")
    try {
        const res = await archiveChatAndGrantReviewerToken(chatInfo)
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

const archiveChatAndGrantReviewerToken = async ({ chatId }) => {
    return db.tx('archiveRequestAndIncrement', async t => {
        await t.none('UPDATE chat SET status = $1 WHERE id = $2', ["ARCHIVED", chatId] )
        await t.none('UPDATE users SET chat_currency = chat_currency + 1 FROM chat WHERE users.id = chat.reviewer_id AND chat.id = $1', [chatId])
    })
}