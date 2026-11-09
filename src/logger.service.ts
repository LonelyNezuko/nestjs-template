import { Inject } from '@nestjs/common'
import moment from 'moment'
import { PinoLogger } from 'nestjs-pino'

export default class LoggerService {
    private static logger: PinoLogger
    constructor(
        @Inject(PinoLogger)
        private readonly pinoLogger: PinoLogger
    ) {
        LoggerService.logger = this.pinoLogger
    }

    private static getDate(): string {
        const currentDate = new Date()

        // @ts-ignore
        return `[${moment(currentDate).format('DD.MM.YYYY, HH:mm:ss:MS')}]`
    }

    private static send(context: string, alias: string | null, message: any, logType: 'log' | 'error' | 'warn' | 'debug', ...args: any[]) {
        if (!message && args.length === 0) return null

        this.logger.setContext(context || '')

        let logData: any = {}
        const consoleArgs: any[] = []

        if (typeof message === 'object' && message !== null) {
            if (message instanceof Error) {
                logData = {
                    msg: message.message,
                    stack: message.stack,
                    name: message.name,
                }
                consoleArgs.push(message)
            } else {
                logData = { ...message }
                consoleArgs.push(message)
            }
        } else {
            logData.msg = message
            consoleArgs.push(message)
        }

        args?.forEach((arg) => {
            if (typeof arg === 'object' && arg !== null) {
                if (arg instanceof Error) {
                    Object.assign(logData, {
                        error: arg.message,
                        stack: arg.stack,
                        name: arg.name,
                    })
                } else {
                    Object.assign(logData, arg)
                }
            }
            consoleArgs.push(arg)
        })

        const text = `${alias || ''}${this.getDate()}`
        console[logType === 'debug' ? 'log' : logType](text, ...consoleArgs)

        if (!process.env.DISABLE_GRAFANA) {
            const pinoLogType = logType === 'log' || logType === 'debug' ? 'info' : logType
            logData.type = logType
            this.logger[pinoLogType](logData)
        }

        return null
    }

    static log(context: string, message: any, ...args: any[]): null {
        if (!message && !args) return null
        return this.send(context, `\x1b[39m`, message, 'log', ...args)
    }

    static error(context: string, message: any, ...args: any[]): null {
        if (!message) return null
        return this.send(context, `\x1b[31m`, message, 'error', ...args)
    }

    static warn(context: string, message: any, ...args: any[]): null {
        if (!message && !args) return null
        return this.send(context, `\x1b[33m`, message, 'warn', ...args)
    }

    static debug(context: string, message: any, ...args: any[]): null {
        if (!message && !args) return null
        return this.send(context, `\x1b[90m(DEBUG) `, message, 'debug', ...args)
    }
}
