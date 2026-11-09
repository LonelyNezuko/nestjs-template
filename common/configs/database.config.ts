import { DataSourceOptions } from "typeorm"

const NODEENV: string = process.env.NODE_ENV

export const databaseConfig: DataSourceOptions = {
    type: 'postgres',
    host: process.env.POSTGRESQL_HOST,
    port: parseInt(process.env.POSTGRESQL_PORT),
    username: process.env.POSTGRESQL_LOGIN,
    password: process.env.POSTGRESQL_PASSWORD,
    database: process.env.POSTGRESQL_DATABASE,
    synchronize: (NODEENV && NODEENV === 'dev') ? true : false,
    logging: false,
    entities: ['**/*.entity{ .ts,.js}'],
    migrations: ['dist/migrations/*{.ts,.js}'],
    extra: {
        charset: "utf8mb4_unicode_ci"
    }
}