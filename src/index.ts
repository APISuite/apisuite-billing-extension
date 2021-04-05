import http from 'http'
import config from './config'
import log from './log'
import App from './app'

const app = new App()
const port = config.get('port')

const server = http.createServer(app.getApp())
server.listen(config.get('port'))

server.on('error', onError)
server.on('listening', () => {
  log.info(`APISuite Billing Ext API Listening on port ${port}`)
})

function onError(error: NodeJS.ErrnoException) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      console.error(port + ' requires elevated privileges')
      process.exit(1)
      break;
    case 'EADDRINUSE':
      console.error(port + ' is already in use')
      process.exit(1)
      break;
    default:
      throw error;
  }
}
