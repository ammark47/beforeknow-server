const { DB_HOST, DB_PORT, DB, DB_USER, DB_PASSWORD } = require('../config')

const pgp = require('pg-promise')()
const connection = {
    host: DB_HOST,
    port: DB_PORT,
    database: DB,
    user: DB_USER,
    password: DB_PASSWORD,
    max: 30 
}

const db = pgp(connection)

module.exports = db;

