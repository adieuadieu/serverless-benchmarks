import request from 'request'
import math from 'mathjs'
import ProgressBar from 'progress'

const limit = 10000
const url = 'https://q6fn31rhzk.execute-api.us-west-2.amazonaws.com/dev/benchmark/graphql/hello'
const query = '{ hello(name: "Bob") }'

const startDate = Date.now()
const progressBar = new ProgressBar(':bar :current/:total (:percent) - :elapsed - ETA :eta', { total: limit })

function makeRequestPromise () {
  return new Promise((resolve, reject) => {
    let begin = Date.now()

    request({ url, qs: { query } })
      .on('socket', () => {
        begin = Date.now()
      })
      .on('response', () => {
        const end = Date.now()
        const delta = end - begin
        resolve(delta)
      })
      .on('error', reject)
  })
}

async function makeRequests () {
  const results = []

  for (let i = 0; i < limit; i++) {
    results[i] = await makeRequestPromise(i)
    progressBar.tick()
  }

  return results
}

async function benchmark () {
  const results = await makeRequests()

  console.log('results', results)

  const min = Math.min(...results)
  const max = Math.max(...results)
  const mean = math.mean(...results)

  console.log('=== Results ===')
  console.log('Date', Date().toLocaleString())
  console.log('Duration', Date.now() - startDate)
  console.log('Requests', results.length)
  console.log('Min', min)
  console.log('Max', max)
  console.log('Mean', mean)
}

benchmark()
