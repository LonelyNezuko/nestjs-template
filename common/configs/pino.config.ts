import { ConfigModule, ConfigService } from '@nestjs/config'
import { LoggerModuleAsyncParams } from 'nestjs-pino'

export const pinoConfig: LoggerModuleAsyncParams = {
    imports: [ConfigModule],
    useFactory: async () => {
        return {
            pinoHttp: {
                level: process.env.LOG_LEVEL || 'info',
                transport: !process.env.DISABLE_GRAFANA ? {
                    target: 'pino-loki',
                    options: {
                        host: process.env.LOKI_HOST,
                        json: true,
                        batch: true,
                        labels: { app: process.env.LOKI_APP_LABEL + '_' + process.env.SERVER },
                    },
                } : undefined,
            },
        }
    },
    inject: [ConfigService],
};