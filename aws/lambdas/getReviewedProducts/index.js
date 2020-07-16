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
    const { query } = event
    const { search } = query
    console.log("getting reviewed products")
    try {
        const res = await getReviewedProducts(search)
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

const getReviewedProducts = async (searchKey) => {
    return db.task('getReviewedProduct', async t => {
        const reviewedProducts = await t.manyOrNone('SELECT * FROM product WHERE product_name ILIKE $1', ['%' + searchKey + '%'])
        return reviewedProducts
    })
}