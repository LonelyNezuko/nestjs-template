import { Controller, Get } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import PrometheusService from "./prometheus.service";

@Controller()
export default class PrometheusController {
    constructor(
        private readonly service: PrometheusService
    ) {}

    @Cron("*/10 * * * * *") // every 10 seconds
    updateMetrics() {
        try {
            this.service.updateNodejsMetrics()
            this.service.pushMetrics()
        }
        catch(e) {
            console.error(e)
        }

        return true
    }
}