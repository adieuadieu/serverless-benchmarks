import request from 'request'
import math from 'mathjs'
import ProgressBar from 'progress'

const LIMIT = 10000
const URL = 'https://q6fn31rhzk.execute-api.us-west-2.amazonaws.com/dev/benchmark/graphql/hello'
const QUERY = '{ hello(name: "Bob") }'

function makeRequestPromise (url, query) {
  return new Promise((resolve, reject) => {
    let begin = Date.now()
    let end
    let delta

    request({ url, qs: { query } }, (error, response, body) => {
      if (error && response.statusCode !== 200) return reject(error)

      return resolve(delta)
    })
    .on('socket', () => {
      begin = Date.now()
    })
    .on('response', () => {
      end = Date.now()
      delta = end - begin
    })
    .on('error', reject)
  })
}

async function makeRequests (url, query, limit, progressBar) {
  const results = []

  for (let i = 0; i < limit; i++) {
    try {
      results[i] = await makeRequestPromise(url, query)
    } catch (error) {
      console.log('request error', error)
    }

    progressBar.tick()
  }

  return results
}

async function benchmark (url, query, limit) {
  const progressBar = new ProgressBar(':bar :current/:total (:percent) - Elapsed :elapsed - ETA :eta', { total: limit })

  const startDate = Date.now()
  const results = await makeRequests(url, query, limit, progressBar)
  const completionDate = Date.now()

  const totalRequests = results.length
  const totalDuration = Date.now() - startDate

  const min = Math.min(...results)
  const max = Math.max(...results)
  const mean = math.mean(...results)

  const data = [Date(completionDate).toLocaleString(), totalRequests, totalDuration, min, max, mean]

  console.log('———— Results ————')
  console.log('Completion Date', Date(completionDate).toLocaleString())
  console.log(`Total Duration:\t\t${totalDuration} ms`)
  console.log(`Requests made:\t\t${totalRequests}`)
  console.log(`Duration Min:\t\t${min} ms`)
  console.log(`Duration Max:\t\t${max} ms`)
  console.log(`Duration Mean:\t\t${mean} ms`)

  console.log('CSV: ', data.join(','))

  return data
}

benchmark(URL, QUERY, LIMIT)
