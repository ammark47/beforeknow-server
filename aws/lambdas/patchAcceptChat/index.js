const { StreamChat } = require("stream-chat")

const serverStreamChat = new StreamChat(
    process.env.STREAM_API_KEY,
    process.env.STREAM_APP_SECRET
)

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
    const userInfo = JSON.parse(event.body)
    const { chat_username, chat_token, name, customerName, productName } = userInfo
    console.log("getting accept chat")
    try {
        const { id: chatId } = await setChatStatusActive(parseInt(reviewerId), parseInt(customerId), parseInt(reviewId))
        const customerChatname = await getChatUsername(parseInt(customerId))

        await serverStreamChat.setUser({
            id: chat_username,
            name: name
        },
            chat_token
        )
    
        const channel = await serverStreamChat.channel(
            'messaging', 
            `${name}-${customerName}-${reviewId}`,
        { 
            members: [ chat_username, customerChatname ],
            status: 'ACTIVE',
            customer: customerChatname,
            reviewer: chat_username,
            reviewId: reviewId,
            productName: productName,
            chatId: chatId,
            name: `${name}-${customerName}-${reviewId}`
        }
        )

        await channel.create()
        await serverStreamChat.disconnect()
    

        return formatResponse({})
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

const setChatStatusActive = async (reviewerId, customerId, reviewId) => {
    return db.one('UPDATE chat SET status = $1 WHERE reviewer_id = $2 AND customer_id = $3 AND review_id = $4 AND status = $5 RETURNING id', ['ACTIVE', reviewerId, customerId, reviewId, 'PENDING'])
}

const getChatUsername = async (userId) => {
    return db.one('SELECT chat_username FROM users WHERE id = $1', [userId])
}