import { Module } from '@nestjs/common';
import { databaseConfig } from 'common/configs/database.config';
import { pinoConfig } from 'common/configs/pino.config';
import { LoggerModule } from 'nestjs-pino';
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleModule } from '@nestjs/schedule'
import LoggerService from './logger.service';
import PrometheusModule from './prometheus/prometheus.module';
import ApiModule from './api/api.module';

@Module({
    imports: [
        LoggerModule.forRootAsync(pinoConfig),

        TypeOrmModule.forRoot(databaseConfig),
        ScheduleModule.forRoot(),

        ApiModule,

        ...(process.env.DISABLE_GRAFANA ? [] : [PrometheusModule])
    ],
    controllers: [],
    providers: [ LoggerService ],
    exports: [  ]
})
export class AppModule {}
