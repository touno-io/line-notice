// const md5 = require('md5')
const { Server } = require('@hapi/hapi')
const Sentry = require('@sentry/node')

const { notice } = require('@touno-io/db/schema')
const logger = require('@touno-io/debuger')('nuxt')
// const { lineInitilize, cmdExpire } = require('./api/tracking')
const config = require('./nuxt.config.js')

const routes = require('./api')

const server = new Server({
  port: 3000,
  host: config.server.host,
  routes: { state: { parse: true, failAction: 'ignore' } }
})
const nuxtCreateBuilder = async () => {
  logger.info('MongoDB db-notice connecting...')
  await notice.open()

  logger.start(`Server initialize... (${process.env.NODE_ENV})`)
  await server.initialize()
  // await (Promise.all([lineInitilize(), cmdExpire()]))
  await server.register({
    plugin: require('hapi-cors'),
    options: {
      origins: [process.env.NODE_ENV !== 'production' ? '*' : 'http://localhost:4000'],
      headers: [process.env.NODE_ENV !== 'production' ? '*' : 'x-id'],
      methods: [process.env.NODE_ENV !== 'production' ? '*' : 'head,get,put,post,delete']
    }
  })

  await server.register({
    plugin: require('hapi-sentry'),
    options: { client: { dsn: process.env.SENTRY_DSN || false } }
  })

  server.route(routes)

  await server.start()
  logger.start(`Server running on ${server.info.uri}`)
}

process.on('unhandledRejection', (ex) => {
  Sentry.captureException(ex)
  logger.error(ex)
  process.exit(1)
})
nuxtCreateBuilder().catch((ex) => {
  Sentry.captureException(ex)
  logger.error(ex)
  process.exit(1)
})
