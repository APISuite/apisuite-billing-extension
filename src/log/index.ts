import pino from 'pino'
import { name } from '../../package.json'

export default pino({
    name,
    level: 'debug',
})