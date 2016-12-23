import express from 'express'

const app = express()

app.get('*', (request, response) => {
  response.status(200).json({
    message: request.query.query,
    express: true,
  })
})

app.listen(3001)
