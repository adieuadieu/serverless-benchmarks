/* eslint-disable no-await-in-loop */
// we're blocking on purpose (so only one request is made/completed at one time)
// http://eslint.org/docs/rules/no-await-in-loop#when-not-to-use-it

import { sleep, measure, makeRequestPromise, logCsv } from './utils'

async function timed ({ url, query, limit, progressBar, wait = 0, concurrency = 1, progressInterval = 750 }) {
  const promises = []
  const startDate = Date.now()
  const endDate = startDate + limit

  progressBar.tick()

  function startExecution () {
    return new Promise(async (resolve) => {
      const data = []

      while (Date.now() < endDate) {
        if (wait) await sleep(wait)

        try {
          const result = await makeRequestPromise(url, query)
          data.push(result)
        } catch (error) {
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
    const left = endDate - Date.now()
    const completed = limit - left

    progressBar.update(completed / limit)
  }, progressInterval)

  const data = await Promise.all(promises).then(results => [].concat(...results)).catch(console.log)

  clearInterval(barInterval)

  progressBar.terminate()

  return data
}

export async function withPreWarm ({ urls, ...options }) {
  const measurements = [
    measure(timed, { title: 'Lambda & API Gateway', url: urls.lambda, ...options }),
    // await measure(timed, { title: 'Direct EC2 (koa@2)', url: urls.koa.ec2, ...options }),
    // await measure(timed, { title: 'EC2 & ALB (koa@2)', url: urls.koa.alb, ...options }),
    // await measure(timed, { title: 'EC2 & ELB (koa@2)', url: urls.koa.elb, ...options }),
    measure(timed, { title: 'Direct EC2 (express@4.14)', url: urls.express.ec2, ...options }),
    measure(timed, { title: 'EC2 & ALB (express@4.14)', url: urls.express.elb, ...options }),
    // await measure(timed, { title: 'EC2 & ELB (express@4.14)', url: urls.express.elb, ...options }),
  ]

  return Promise.all(measurements).then(logCsv).catch(console.error)
  // logCsv(measurements)

  return measurements
}
