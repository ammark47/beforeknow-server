const monitor = require('pg-monitor')
const initOptions = {
    query(e) {
        /* do some of your own processing, if needed */

        monitor.query(e); // monitor the event;
    },
    error(err, e) {
        /* do some of your own processing, if needed */
        
        monitor.error(err, e); // monitor the event;
    }
}

const pgp = require('pg-promise')(initOptions)

monitor.attach(initOptions)

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
    const { userId } = pathParameters
    console.log("getting chat name")
    try {
        const res = await getChatUsername(parseInt(userId))
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

const getChatUsername = async (userId) => {
    return db.one('SELECT chat_username FROM users WHERE id = $1', [userId])
}