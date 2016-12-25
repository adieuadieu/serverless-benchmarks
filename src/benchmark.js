import * as limited from './measurements/limited'
import * as timed from './measurements/timed'

const options = {
  logging: true,
  removeOutliers: true, // remove lowest (one) and highest (one) response times from results?
  csvPath: 'results/test.csv', // `results/measurements-${Date.now()}.csv`
  progressInterval: 750,
  concurrency: 1,
  sampleCount: 10002,
  query: '{ hello(name: "Bob") }',
}

const urls = {
  lambda: 'https://q6fn31rhzk.execute-api.us-west-2.amazonaws.com/dev/measure/graphql/hello',
  koa: {
    ec2: 'http://54.202.166.173:3000/dev/measure/graphql/hello',
    alb: 'http://measure-test-333733390.us-west-2.elb.amazonaws.com/dev/measure/graphql/hello',
    elb: 'http://measure-elb-345285823.us-west-2.elb.amazonaws.com/dev/measure/graphql/hello',
  },
  express: {
    ec2: 'http://54.202.166.173:3001/dev/measure/graphql/hello',
    alb: 'http://measure-test-333733390.us-west-2.elb.amazonaws.com:3001/dev/measure/graphql/hello',
    elb: 'http://measure-elb-345285823.us-west-2.elb.amazonaws.com:3001/dev/measure/graphql/hello',
  },
}

(async function run () {
  await limited.withConcurrency({ urls, ...options })
  await timed.withPreBurst({ urls, ...options })

}())
