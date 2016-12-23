import request from 'request'
import math from 'mathjs'
import ProgressBar from 'progress'

const LOGGING = true
const LIMIT = 10000
const QUERY = '{ hello(name: "Bob") }'
const LAMBDA_URL = 'https://q6fn31rhzk.execute-api.us-west-2.amazonaws.com/dev/benchmark/graphql/hello'
const EC2_URL = 'http://54.213.4.217:3000/dev/benchmark/graphql/hello'
const EC2_ALB_URL = 'http://benchmark-test-333733390.us-west-2.elb.amazonaws.com/dev/benchmark/graphql/hello'
const EC2_ELB_URL = 'http://benchmark-elb-345285823.us-west-2.elb.amazonaws.com/dev/benchmark/graphql/hello'

function makeRequestPromise (url, query) {
  return new Promise((resolve, reject) => {
    let begin = Date.now()
    let end
    let delta

    request({ url, qs: { query } }, (error, response /* , body */) => {
      if (error || response.statusCode !== 200) return reject(error)

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

  for (let i = 0; i < limit; i += 1) {
    try {
      // we're blocking on purpose (so only one request is made/completed at one time)
      // http://eslint.org/docs/rules/no-await-in-loop#when-not-to-use-it
      // eslint-disable-next-line no-await-in-loop
      results[i] = await makeRequestPromise(url, query)
    } catch (error) {
      console.log('request error', error)
    }

    progressBar.tick()
  }

  return results
}

function over (values, ms) {
  return values.reduce((count, value) => (value > ms ? count + 1 : count), 0)
}

function csvLine (data) {
  if (typeof data[0] !== 'string') {
    console.log('CSV:')
    data.forEach(row => console.log(row.join(',')))
  } else {
    console.log('CSV:\n', data.join(','))
  }
}

async function benchmark (title, url, query, limit, logging = LOGGING) {
  const progressBar = new ProgressBar(`${title} — :bar :current/:total (:percent) - Elapsed :elapsed - ETA :eta`, { total: limit })

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
    title,
    Date(completionDate).toLocaleString(), totalRequests, totalDuration,
    min, max, mean, std,
    quant25, quant50, quant75, quant90, quant99,
    over05, over1, over2, over3, over4, over5,
  ]

  if (logging) {
    console.log(`———— Results: ${title} ————`)
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
  }

  return data
}

(async function main () {
  const runs = [
    await benchmark('Lambda & API Gateway', LAMBDA_URL, QUERY, LIMIT),
    await benchmark('Raw EC2', EC2_URL, QUERY, LIMIT),
    await benchmark('EC2 & ALB', EC2_ALB_URL, QUERY, LIMIT),
    await benchmark('EC2 & ELB', EC2_ELB_URL, QUERY, LIMIT),
  ]

  Promise.all(runs).then(csvLine)
}())
