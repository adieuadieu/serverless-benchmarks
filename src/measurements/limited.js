/* eslint-disable no-await-in-loop */
// we're blocking on purpose (so only one request is made/completed at one time)
// http://eslint.org/docs/rules/no-await-in-loop#when-not-to-use-it

import ProgressBar from 'progress'
import { sleep, removeArrayOutliers, makeRequestPromise, processResults, logCsv } from './utils'

async function makeMeasurements ({ url, query, limit, progressBar, wait = 0, concurrency = 1, progressInterval = 750 }) {
  let count = 0
  const promises = []

  progressBar.tick()

  function startExecution () {
    return new Promise(async (resolve) => {
      const data = []

      while (count < limit) {
        count += 1

        if (wait) await sleep(wait)

        try {
          const result = await makeRequestPromise(url, query)
          data.push(result)
        } catch (error) {
          count -= 1
          console.error('\nRequest failure:', error)
        }
      }

      resolve(data)
    })
  }

  for (let i = 0; i < concurrency; i += 1) {
    promises.push(startExecution())
  }

  const barInterval = setInterval(() => {
    progressBar.update(count / limit)
  }, progressInterval)

  const data = await Promise.all(promises).then(results => [].concat(...results)).catch(console.log)

  clearInterval(barInterval)

  progressBar.terminate()

  return data
}

async function measure ({ title, url, query, limit, logging = true, wait = 0, concurrency = 1, csvPath, removeOutliers }) {
  const progressBar = new ProgressBar(
    `${title} :bar :current/:total (:percent) - Elapsed :elapsed - ETA :eta`,
    { total: limit, clear: true, width: 100 },
  )

  const startDate = Date.now()
  let results

  try {
    results = await makeMeasurements(url, query, limit, progressBar, wait, concurrency)
  } catch (error) {
    console.log('measure measurement error:', error)
  }

  const completionDate = Date.now()

  if (removeOutliers) results = removeArrayOutliers(results)

  return processResults({ title, startDate, completionDate, logging, concurrency, results, csvPath })
}

export async function withConcurrency ({ urls, ...options }) {
  const runs = [
    await measure({ title: 'Lambda & API Gateway', url: urls.lambda, ...options }),
    await measure({ title: 'Direct EC2 (koa@2)', url: urls.koa.ec2, ...options }),
    await measure({ title: 'EC2 & ALB (koa@2)', url: urls.koa.alb, ...options }),
    await measure({ title: 'EC2 & ELB (koa@2)', url: urls.koa.elb, ...options }),
    await measure({ title: 'Direct EC2 (express@4.14)', url: urls.express.ec2, ...options }),
    await measure({ title: 'EC2 & ALB (express@4.14)', url: urls.express.elb, ...options }),
    await measure({ title: 'EC2 & ELB (express@4.14)', url: urls.express.elb, ...options }),
  ]

  return Promise.all(runs).then(logCsv).catch(console.error)
}

export async function lambdaOnlyWithWait ({ urls, ...options }) {
  const runs = [
    await measure({ title: 'Lambda & API Gateway (30s wait)', url: urls.lambda, ...options, wait: 30000 }),
    await measure({ title: 'Lambda & API Gateway (10s wait)', url: urls.lambda, ...options, wait: 10000 }),
    await measure({ title: 'Lambda & API Gateway (5s wait)', url: urls.lambda, ...options, wait: 5000 }),
    await measure({ title: 'Lambda & API Gateway (2s wait)', url: urls.lambda, ...options, wait: 2000 }),
    await measure({ title: 'Lambda & API Gateway (0s wait)', url: urls.lambda, ...options, wait: 0 }),
  ]

  return Promise.all(runs).then(logCsv).catch(console.error)
}
