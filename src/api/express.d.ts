import MicroserviceEntity from "src/entities/others/microservice.entity";
import ServiceEntity from "src/entities/service.entity";
import { B2BAccount } from "./api.types";

declare module 'express' {
    export interface Request {
        account: B2BAccount
        service: ServiceEntity
    }
}