import pino from 'pino'
import config from '../config'
import { name } from '../../package.json'

export default pino({
    name,
    level: config.get('logLevel'),
})