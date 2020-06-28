const db = require('./index')

const productModel = require('./product_model')

const insertNewReview = async (reviewData) => {
    return db.task('getInsertReview', async t => {
        const { id: productId } = await productModel.insertNewProduct(reviewData.product)
        reviewData.productId = productId
        const review = await t.oneOrNone("SELECT * FROM review WHERE product_id = ${productId} AND user_id = ${userId}", reviewData)
        if (review) {
            throw new Error("review exists")
        } 

        const newReview = await t.one('INSERT INTO review(review_text,rating,user_id,product_id) VALUES (${review}, ${rating}, ${userId}, ${productId}) RETURNING *', reviewData)
        return newReview
    })
}

const getReviewersFromProductId = async (productId) => {
    try {
        const reviewerAndUserInfo = await db.any('SELECT review.id, review.product_id, review.user_id, review.review_text, users.name, review.rating FROM review JOIN users ON users.id = review.user_id WHERE product_id = $1', [productId])
        return reviewerAndUserInfo
    } catch (e) {
        console.log('error', e)
        return e
    }
}

module.exports = {
    insertNewReview,
    getReviewersFromProductId
}


// TODO: return false or error when review already exists for user
