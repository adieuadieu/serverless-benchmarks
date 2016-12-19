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

function over (values, ms) {
  return values.reduce((count, value) => value > ms ? count + 1 : count, 0)
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
  const std = math.std(results, 'uncorrected')
  const quant25 = math.quantileSeq(results, 0.25)
  const quant50 = math.quantileSeq(results, 0.5)
  const quant75 = math.quantileSeq(results, 0.75)
  const quant90 = math.quantileSeq(results, 0.90)
  const quant99 = math.quantileSeq(results, 0.99)
  const over05 = over(results, 500)
  const over1 = over(results, 1000)
  const over2 = over(results, 2000)
  const over3 = over(results, 3000)
  const over4 = over(results, 4000)
  const over5 = over(results, 5000)

  const data = [
    Date(completionDate).toLocaleString(), totalRequests, totalDuration,
    min, max, mean, std,
    quant25, quant50, quant75, quant90, quant99,
    over05, over1, over2, over3, over4, over5,
  ]

  console.log('———— Results ————')
  console.log('Completion Date:\t', Date(completionDate).toLocaleString())
  console.log(`Total Duration:\t\t${totalDuration} ms`)
  console.log(`Requests made:\t\t${totalRequests}`)
  console.log(`Duration Min:\t\t${min} ms`)
  console.log(`Duration Max:\t\t${max} ms`)
  console.log(`Duration Mean:\t\t${mean} ms`)
  console.log(`Duration Std:\t\t${std} ms`)
  console.log(`Duration Quant 25%:\t${quant25} ms`)
  console.log(`Duration Quant 50%:\t${quant50} ms`)
  console.log(`Duration Quant 75%:\t${quant75} ms`)
  console.log(`Duration Quant 90%:\t${quant90} ms`)
  console.log(`Duration Quant 99%:\t${quant99} ms`)
  console.log(`Duration Over 0.5s:\t${over05}`)
  console.log(`Duration Over 1s:\t${over1}`)
  console.log(`Duration Over 2s:\t${over2}`)
  console.log(`Duration Over 3s:\t${over3}`)
  console.log(`Duration Over 4s:\t${over4}`)
  console.log(`Duration Over 5s:\t${over5}`)

  console.log('CSV:\n', data.join(','))

  return data
}

benchmark(URL, QUERY, LIMIT)
