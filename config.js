const dotenv = require('dotenv')
dotenv.config()

module.exports = {
    mode: process.env.APP_ENV,
    STREAM_API_KEY: process.env.STREAM_API_KEY,
    STREAM_APP_SECRET: process.env.STREAM_APP_SECRET,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PASS,
    DB: process.env.DB,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD
}