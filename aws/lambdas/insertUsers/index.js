const { StreamChat } = require("stream-chat")

const serverStreamChat = new StreamChat(
    process.env.STREAM_API_KEY,
    process.env.STREAM_APP_SECRET
)

const initOptions = {

    // pg-promise initialization options...

    task(e) {
        if (e.ctx.finish) {
            // this is a task->finish event;
            console.log('Duration:', e.ctx.duration);
            if (e.ctx.success) {
                // e.ctx.result = resolved data;
            } else {
                // e.ctx.result = error/rejection reason;
            }
        } else {
            // this is a task->start event;
            console.log('Start Time:', e.ctx.start);
        }
    }
}

const monitor = require('pg-monitor')
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
    console.log("creating user")
    const { email, name } = event.profile
    // create stream chat user and token
    const chatUsername = email.replace(/([^a-z0-9_-]+)/gi, "_")
    const token = serverStreamChat.createToken(chatUsername)
    
    try {
        console.log('before insert', event.body)
        const res = await getInsertUser({...event, token, chatUsername})
        console.log('after insert')
        // if new user, create one direct channel with me 
        const { userAlreadyExists } = res
        console.log("user exists", userAlreadyExists)
        if (!userAlreadyExists) {
            await serverStreamChat.setUser({
                id: chatUsername,
                name: name
                },
                token
            )

            // create direct chat with Ammar
            const channel = await serverStreamChat.channel(
                'messaging', 
                { 
                    members: [ chatUsername, process.env.DIRECT_CHAT ],
                    status: 'ACTIVE',
                    customer: chatUsername,
                    reviewer: chatUsername,
                    direct: process.env.DIRECT_CHAT,
                    cancellable: false,
                    name: `Your direct chat with Before Know`
                }
            )
            console.log("created channel", channel)
            await channel.create()
            await serverStreamChat.disconnect()
        }
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
        "body": body
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
        "body": error.code + ": " + error.message
    }
    return response
}

const getInsertUser = async ( userData) => {
    return await db.task('getInsertUser', async t => {
        console.log('insert user callback fired', userData)
        const user = await t.oneOrNone('SELECT * FROM users WHERE unique_id = ${profile.sub}', userData);
        if (user) {
            return { ...user, userAlreadyExists: true }
        } else {
            const newUser = await t.one('INSERT INTO users(unique_id, name, email, chat_token, chat_username) VALUES(${profile.sub}, ${profile.nickname}, ${profile.email}, ${token}, ${chatUsername}) RETURNING *', userData);
            return {...newUser, userAlreadyExists: false }
        }
    })
}
