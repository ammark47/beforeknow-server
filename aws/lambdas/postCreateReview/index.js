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
    const reviewInfo = JSON.parse(event.body)
    console.log("inserting new review")
    try {
        const res = await insertNewReview(reviewInfo)
        return formatResponse(res)
    } catch (error) {
        console.error(error)
        if (error.message === 'review exists'){
            return formatError(error, 403)
        } else {
            return formatError(error, 500)
        }
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

var formatError = function(error, errorCode){
    var response = {
        "statusCode": errorCode,
        "headers": {
        "Content-Type": "text/plain",
        "x-amzn-ErrorType": errorCode
        },
        "isBase64Encoded": false,
        "body": JSON.stringify(error)
    }
    return response
}

const insertNewReview = async (reviewData) => {
    return db.task('getInsertReview', async t => {
        const { id: productId } = await insertNewProduct(reviewData.product)
        reviewData.productId = productId
        const review = await t.oneOrNone("SELECT * FROM review WHERE product_id = ${productId} AND user_id = ${userId}", reviewData)
        if (review) {
            throw new Error("review exists")
        } 

        const newReview = await t.one('INSERT INTO review(review_text,rating,user_id,product_id) VALUES (${review}, ${rating}, ${userId}, ${productId}) RETURNING *', reviewData)
        return newReview
    })
}

const insertNewProduct = async (productData) => {
    productData.storeName = "walmart"

    return db.task('getInsertProduct', async t => {
        const product = await t.oneOrNone('SELECT * FROM product WHERE store_name = ${storeName} AND store_item_id = ${itemId}', productData)
        return product || await t.one('INSERT INTO product(store_name,product_name,store_item_id,small_image) VALUES (${storeName}, ${name}, ${itemId}, ${mediumImage}) RETURNING *', productData)
    })
}