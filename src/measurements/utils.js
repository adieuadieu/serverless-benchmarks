import fs from 'fs'
import request from 'request'
import math from 'mathjs'
import ProgressBar from 'progress'

export async function sleep (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

export function over (values, ms) {
  return values.reduce((count, value) => (value > ms ? count + 1 : count), 0)
}

export function findOutlierIndex (array = []) {
  const outliers = array.reduce((info, num, index) => {
    const newInfo = { ...info }

    if (num < info.lowNum || !info.lowNum) {
      newInfo.lowNum = num
      newInfo.lowIndex = index
    }
    if (num > info.highNum || !info.highNum) {
      newInfo.highNum = num
      newInfo.highIndex = index
    }

    return newInfo
  }, {})

  return [outliers.lowIndex, outliers.highIndex]
}

export function removeArrayOutliers (array = []) {
  const newArray = [...array]

  findOutlierIndex(array).forEach(index => newArray.splice(index, 1))

  return newArray
}

export function writeCsv (path, data) {
  if (!path) throw new Error('No CSV file path provided.')

  if (typeof data[0] !== 'string') {
    data.forEach(line => fs.appendFileSync(path, `${line.join(',')}\n`, 'utf-8'))
  } else {
    fs.appendFileSync(path, `${data.join(',')}\n`, 'utf-8')
  }
}

export function logCsv (data) {
  console.log('\nCSV:')

  if (typeof data[0] !== 'string') {
    data.forEach(line => console.log(line.join(',')))
  } else {
    console.log(data.join(','))
  }
}

export function makeRequestPromise (url, query) {
  return new Promise((resolve, reject) => {
    let begin = Date.now()
    let end
    let delta

    request({ url, qs: { query } }, (error, response /* , body */) => {
      if (error || response.statusCode !== 200) return reject({ status: response && response.statusCode, error })

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

export function processResults ({ title, startDate, completionDate, logging, concurrency, results, csvPath }) {
  const totalRequests = results.length
  const totalDuration = Date.now() - startDate
  const rps = totalRequests / (totalDuration / 1000)

  const min = math.min(results)
  const max = math.max(results)
  const mean = math.mean(results)
  const std = math.std(results, 'uncorrected')
  const quant25 = math.quantileSeq(results, 0.25)
  const quant50 = math.quantileSeq(results, 0.5)
  const quant75 = math.quantileSeq(results, 0.75)
  const quant90 = math.quantileSeq(results, 0.90)
  const quant99 = math.quantileSeq(results, 0.99)
  const quant995 = math.quantileSeq(results, 0.995)
  const quant998 = math.quantileSeq(results, 0.998)
  const quant999 = math.quantileSeq(results, 0.999)
  const over05 = over(results, 500)
  const over1 = over(results, 1000)
  const over2 = over(results, 2000)
  const over3 = over(results, 3000)
  const over4 = over(results, 4000)
  const over5 = over(results, 5000)

  const data = [
    title,
    Date(completionDate).toLocaleString(), concurrency, totalRequests, totalDuration, rps,
    min, max, mean, std,
    quant25, quant50, quant75, quant90, quant99, quant995, quant998, quant999,
    over05, over1, over2, over3, over4, over5,
  ]

  if (logging) {
    console.log(`———— Results: ${title} ————`)
    console.log('Completion Date:\t', Date(completionDate).toLocaleString())
    console.log(`Total Duration:\t\t${totalDuration} ms`)
    console.log(`Requests made:\t\t${totalRequests}`)
    console.log(`Requests per second:\t${rps}`)
    console.log(`Duration Min:\t\t${min} ms`)
    console.log(`Duration Max:\t\t${max} ms`)
    console.log(`Duration Mean:\t\t${mean} ms`)
    console.log(`Duration Std:\t\t${std} ms`)
    console.log(`Duration Quant 25%:\t${quant25} ms`)
    console.log(`Duration Quant 50%:\t${quant50} ms`)
    console.log(`Duration Quant 75%:\t${quant75} ms`)
    console.log(`Duration Quant 90%:\t${quant90} ms`)
    console.log(`Duration Quant 99%:\t${quant99} ms`)
    console.log(`Duration Quant 99.5%:\t${quant995} ms`)
    console.log(`Duration Quant 99.8%:\t${quant998} ms`)
    console.log(`Duration Quant 99.9%:\t${quant999} ms`)
    console.log(`Duration Over 0.5s:\t${over05}`)
    console.log(`Duration Over 1s:\t${over1}`)
    console.log(`Duration Over 2s:\t${over2}`)
    console.log(`Duration Over 3s:\t${over3}`)
    console.log(`Duration Over 4s:\t${over4}`)
    console.log(`Duration Over 5s:\t${over5}`)
  }

  writeCsv(csvPath, data)

  return data
}

export async function measure (
  makeMeasurements,
  { title, url, query, limit, logging = true, wait = 0, concurrency = 1, csvPath, removeOutliers, ...options },
) {
  const progressBar = new ProgressBar(
    `${title} :bar :current/:total (:percent) - Elapsed :elapsed - ETA :eta`,
    { total: limit, clear: true, width: 100 },
  )

  const startDate = Date.now()
  let results

  try {
    results = await makeMeasurements({ url, query, limit, progressBar, wait, concurrency, ...options })
  } catch (error) {
    console.log('measure measurement error:', error)
  }

  const completionDate = Date.now()

  if (removeOutliers) results = removeArrayOutliers(results)

  return processResults({ title, startDate, completionDate, logging, concurrency, results, csvPath })
}
