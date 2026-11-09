import { databaseConfig } from "common/configs/database.config"
import { DataSource } from "typeorm"

const dataSource = new DataSource(databaseConfig)
export default dataSource