const db = require('./index')

const checkIfPendingOrActiveChatExists = async (customerId, userId, review_id) => {
    const chat = await db.oneOrNone('SELECT * FROM chat WHERE customer_id = $1 AND reviewer_id = $2 AND review_id = $3 AND (status = $4 OR status = $5)' , [customerId, userId, review_id, "ACTIVE", "PENDING"])
    return chat ? true : false
}

const insertNewChatRequest = async (chatInfo) => {
    return await db.none('INSERT INTO chat(customer_id, reviewer_id, status, review_id) VALUES (${customerId}, ${reviewerId}, ${status}, ${reviewId})', {...chatInfo, status: 'PENDING'} )
}

const insertNewChatRequestAndDecrementCurrency = async (chatInfo) => {
    return db.tx('insertRequestAndDecrement', async t => {
        await t.none('INSERT INTO chat(customer_id, reviewer_id, status, review_id) VALUES (${customerId}, ${reviewerId}, ${status}, ${reviewId})', {...chatInfo, status: 'PENDING'} )
        await t.none('UPDATE users SET chat_currency = chat_currency - 1 WHERE id = ${customerId}', chatInfo)
    })
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

const getChatStatus = async (reviewerId, customerId, reviewId) => {
    const status = await db.oneOrNone('SELECT status FROM chat WHERE reviewer_id = $1 AND customer_id = $2 AND review_id = $3', [reviewerId, customerId, reviewId])
    return status || {status: 'DOES NOT EXIST'}
}

const setChatStatusActive = async (reviewerId, customerId, reviewId) => {
    return db.none('UPDATE chat SET status = $1 WHERE reviewer_id = $2 AND customer_id = $3 AND review_id = $4', ['ACTIVE', reviewerId, customerId, reviewId])
}

const setChatStatusDeclined = async (reviewerId, customerId, reviewId) => {
    return db.none('UPDATE chat SET status = $1 WHERE reviewer_id = $2 AND customer_id = $3 AND review_id = $4', ['DECLINED', reviewerId, customerId, reviewId])
}

module.exports = {
    checkIfPendingOrActiveChatExists,
    insertNewChatRequest,
    getAllPendingChatRequestsForUser,
    getChatStatus,
    setChatStatusActive,
    insertNewChatRequestAndDecrementCurrency,
    setChatStatusDeclined
}