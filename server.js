require('custom-env').env(process.env.NODE_ENV) 
const { STREAM_API_KEY, STREAM_APP_SECRET } = require('./config')
const express = require('express')
const app = express()
const port = 8080
var bodyParser = require('body-parser')
const { StreamChat } = require("stream-chat")
const walmart = require('./db_helpers/walmart_api')


const userModel = require('./db_helpers/user_model')
const productModel = require('./db_helpers/product_model')
const reviewModel = require('./db_helpers/review_model')
const chatModel = require('./db_helpers/chat_model')

app.use((req,res,next) => {console.log(req.path); next() })

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers');
  next();
});

const serverStreamChat = new StreamChat(
  STREAM_API_KEY,
  STREAM_APP_SECRET
);

app.post('/users', async (req, res) => {  
  const { email, name } = req.body.profile
  // create stream chat user and token
  const chatUsername = email.replace(/([^a-z0-9_-]+)/gi, "_")
  const token = serverStreamChat.createToken(chatUsername)


  // create user in postgres
  userModel.getInsertUser({...req.body, token, chatUsername})
  .then(async response => {
      // if new user, create one direct channel with me 
      const { userAlreadyExists } = response
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
              members: [ chatUsername, 'ammark1111_gmail_com' ],
              status: 'ACTIVE',
              customer: chatUsername,
              reviewer: chatUsername,
              direct: 'ammark1111_gmail_com',
              cancellable: false,
              name: `Your direct chat with Before Know`
          }
        )
        console.log("created channel", channel)
        await channel.create()
        await serverStreamChat.disconnect()
      }

      res.status(200).json(response)
  })
  .catch(error => {
      console.error(error)
      res.status(500).send(error)
  })
})

app.get('/users/:userId/chat-currency', (req, res) => {
  const { userId } = req.params
  console.log(userId)
  userModel.getChatCurrencyCount(userId)
  .then(response => {
    console.log(response)
    const { chat_currency } = response
    res.status(200).send({ chat_currency })
  })
  .catch(error => {
    console.error('error', error)
    res.status(500).send(error)
  })
})

app.get('/users/:userId/chat-name', (req, res) => {
  const { userId } = req.params
  console.log(userId)
  userModel.getChatUsername(userId)
  .then(response => {
    console.log(response)
    res.status(200).send( response )
  })
  .catch(error => {
    console.error('error', error)
    res.status(500).send(error)
  })
})

app.get('/chat/:customerId/:userId/:reviewId', (req, res) => {
  const { customerId, userId, reviewId } = req.params
  chatModel.checkIfPendingOrActiveChatExists(customerId, userId, reviewId)
  .then(response => {
    console.log(response)
    res.status(200).send(response)
  })
  .catch(error => {
    console.error('error', error)
    res.status(500).send(error)
  })
})

app.get('/chat/status/:reviewerId/:customerId/:reviewId', (req, res) => {
  const { customerId, reviewerId, reviewId } = req.params
  chatModel.getChatStatus(reviewerId, customerId, reviewId)
  .then(response => {
    console.log(response)
    res.status(200).send(response)
  })
  .catch(error => {
    console.error('error', error)
    res.status(500).send(error)
  })
})

app.patch('/chat/accept/:reviewerId/:customerId/:reviewId', (req, res) => {
  const { customerId, reviewerId, reviewId } = req.params
  const { chat_username, chat_token, name, customerName, productName } = req.body

  chatModel.setChatStatusActive(reviewerId, customerId, reviewId)
  .then(() => {
    return userModel.getChatUsername(customerId)    
  })
  .then(async ({ chat_username: customerChatname }) => {
    // create getStream conversation
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
          name: `${name}-${customerName}-${reviewId}`
      }
    )

    await channel.create()
    serverStreamChat.disconnect()

    res.status(200).send()
  })
  .catch(error => {
    console.error('error', error)
    res.status(500).send(error)
  })
})

app.patch('/chat/decline/:reviewerId/:customerId/:reviewId', (req, res) => {
  const { customerId, reviewerId, reviewId } = req.params
  chatModel.setChatStatusDeclined(reviewerId, customerId, reviewId)
  .then(response => {
    console.log(response)
    res.status(200).send(response)
  })
  .catch(error => {
    console.error('error', error)
    res.status(500).send(error)
  })
})

app.post('/chat', (req, res) => {
  chatModel.insertNewChatRequestAndDecrementCurrency(req.body)
  .then(response => {
    console.log(response)
    res.status(200).send(response)
  })
  .catch(error => {
    console.error('error', error)
    res.status(500).send(error)
  })
})

app.get('/chat/:userId', (req, res) => {
  const { userId } = req.params
  chatModel.getAllPendingChatRequestsForUser(userId)
  .then(response => {
    console.log(response)
    res.status(200).send(response)
  })
  .catch(error => {
    console.error('error', error)
    res.status(500).send(error)
  })
})

app.get('/products', (req, res) => {
  const { search } = req.query
  console.log(search) 
  productModel.getReviewedProducts(search)
    .then(response => {
      console.log(response)
      res.status(200).send(response)
    })
    .catch(error => {
      console.error('error', error)
      res.status(500).send(error)
    })
})

app.get('/products/:productId', (req, res) => {
  const { productId } = req.params
  productModel.getProductInfo(productId)
    .then(response => {
      console.log(response)
      res.status(200).send(response)
    })
    .catch(error => {
      console.error('error', error)
      res.status(500).send(error)
    })
})

app.get('/reviews/:productId', (req, res) => {
  const { productId } = req.params
  reviewModel.getReviewersFromProductId(productId)
    .then(response => {
      console.log(response)
      res.status(200).send(response)
    })
    .catch(error => {
      console.error('error', error)
      res.status(500).send(error)
    })
})

app.post('/reviews/create', (req, res, next) => {
  reviewModel.insertNewReview(req.body)
  .then(response => {
    res.status(200).send(response)
  })
  .catch(error => {
    if (error.message === 'review exists') {
      res.status(403).send(error)
      next()
    } else {
      res.status(500).send(error)
      next()
    }
  })
})

app.get('/walmart/products/:searchQuery', async (req, res) => {
  const { searchQuery, start } = req.params
  try {
      const items = await walmart.getWalmartProducts(searchQuery, start)
      console.log(items)
      res.status(200).json(items)
  } catch (error) {
      res.status(500).send(error)
  }  
})

app.listen(port, () => {
  console.log(`App running on port ${port}.`)
})

