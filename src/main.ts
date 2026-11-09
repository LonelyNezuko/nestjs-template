import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import LoggerService from './logger.service';

async function bootstrap() {
    const app = await NestFactory.create(AppModule)

    if(!process.env.DISABLE_GRAFANA) {
        app.useLogger(app.get(Logger))
    }

    app.useGlobalPipes(new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true
    }))

    app.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: [
            'Origin',
            'X-Requested-With',
            'Content-Type',
            'Accept',
            'Authorization',
            'X-Service-Key',
            'X-API-Key',
            'X-Requested-With',
            'Access-Control-Allow-Headers',
            'Access-Control-Allow-Origin',
        ],
        exposedHeaders: [
            'Authorization',
            'Content-Disposition',
            'Content-Length',
            'X-Content-Type-Options',
        ],
        preflightContinue: false,
        optionsSuccessStatus: 204,
        maxAge: 86400
    })

    await app.listen(process.env.BACKEND_PORT)
    LoggerService.log('Startup', `Nest application has been started on ${process.env.BACKEND_PORT} port`)

}
bootstrap()

process.on('uncaughtException', e => {
    LoggerService.error('UncaughtException', e.message, e)
})

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    if(reason?.message.includes('Execution context was destroyed, most likely because of a navigation'))return
    
    LoggerService.error('UnhandledRejection', reason?.message || "UnhandledRejection Error", reason, promise)
})