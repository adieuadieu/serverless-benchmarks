import fs from 'fs'
import * as limited from './measurements/limited'
import * as timed from './measurements/timed'

const options = {
  logging: true,
  removeOutliers: true, // remove lowest (one) and highest (one) response times from results?
  csvPath: 'results/test.csv', // `results/measurements-${Date.now()}.csv`
  progressInterval: 750,
  concurrency: 1,
  sampleCount: 1000002,
  duration: 1000 * 60,// * 60,
  query: '{ hello(name: "Bob") }',
}

const limitedOptions = {
  ...options,
  limit: options.sampleCount,
  concurrency: 20,
}

const timedOptions = {
  ...options,
  concurrency: 100,
  limit: options.duration,
  progressInterval: 1000,
}

const urls = {
  lambda: 'https://q6fn31rhzk.execute-api.us-west-2.amazonaws.com/dev/benchmark/graphql/hello',
  koa: {
    ec2: 'http://54.202.166.173:3000/dev/benchmark/graphql/hello',
    alb: 'http://benchmark-test-333733390.us-west-2.elb.amazonaws.com/dev/benchmark/graphql/hello',
    elb: 'http://benchmark-elb-345285823.us-west-2.elb.amazonaws.com/dev/benchmark/graphql/hello',
  },
  express: {
    ec2: 'http://54.202.166.173:3001/dev/benchmark/graphql/hello',
    alb: 'http://benchmark-test-333733390.us-west-2.elb.amazonaws.com:3001/dev/benchmark/graphql/hello',
    elb: 'http://benchmark-elb-345285823.us-west-2.elb.amazonaws.com:3001/dev/benchmark/graphql/hello',
  },
}

;(async function run () {
  fs.appendFileSync(options.csvPath, ',\n', 'utf-8')

  try {
    await limited.withConcurrency({ urls, ...limitedOptions })
    await limited.lambdaOnlyWithWait({ urls, ...limitedOptions, limit: 1000 })
    // await timed.withPreWarm({ urls, ...timedOptions })
  } catch (error) {
    console.error('Run error:', error, error.stack)
  }
}())
