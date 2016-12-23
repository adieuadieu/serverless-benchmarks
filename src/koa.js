import Koa from 'koa'

const app = new Koa()

/*
app.use(async (context, next) => {
  try {
    await next()
  } catch (error) {
    context.body = { error: error.message }
    context.status = error.status || 500
  }
})
*/

app.use(async (context) => {
  context.status = 200
  context.body = { message: context.request.query.query }
})

app.listen(3000)
