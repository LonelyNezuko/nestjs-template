import { Injectable } from "@nestjs/common";
import axios from "axios";
import { Counter, Gauge, Histogram, PrometheusContentType, Pushgateway, Registry, Summary } from "prom-client";
import * as os from 'os'
import calculateCpuUsage from "common/utils/calculateCpuUsage";
import LoggerService from "../logger.service";

@Injectable()
export default class PrometheusService {
    private registry: Registry
    private pushgateway: Pushgateway<PrometheusContentType>
    private pushgatewayUrl = process.env.PUSHGATEWAY_URL

    constructor() {
        this.registry = new Registry()
        this.pushgateway = new Pushgateway(this.pushgatewayUrl, {}, this.registry)

        this.initializeMetrics()
    }

    // Метрики node
    private static cpuUsage: Gauge
    private static processCpu: Gauge
    private static memoryInfo: Gauge

    // Метрики Node.js
    private static nodejsEventLoopLag: Gauge
    private static nodejsUptime: Gauge

    // Метрики приложения
    private static httpRequestsTotal: Gauge
    private static httpExeptionsRequestsTotal: Gauge
    private static rabbitRequestTotal: Gauge
    private static rabbitRequestSendTotal: Gauge

    private static httpRequestsDuration: Histogram
    private static rabbitRequestsDuration: Histogram

    // health
    private static healthLastUpdateUnix: Gauge

    private initializeMetrics() {
        // Метрики node
        PrometheusService.cpuUsage = new Gauge({
            name: 'node_cpu_usage_percent',
            help: 'Total CPU usage percentage',
            labelNames: ['type'],
            registers: [this.registry],
        })
        PrometheusService.processCpu = new Gauge({
            name: 'node_process_cpu_seconds_total',
            help: 'Total CPU time used by the process',
            labelNames: ['mode'],
            registers: [this.registry],
        })
        PrometheusService.memoryInfo = new Gauge({
            name: 'node_memory_info_bytes',
            help: 'System memory information',
            labelNames: ['type'],
            registers: [this.registry],
        })

        // Метрики Event Loop
        PrometheusService.nodejsEventLoopLag = new Gauge({
            name: 'nodejs_eventloop_lag_seconds',
            help: 'Event loop lag in seconds',
            registers: [this.registry],
        })

        // Uptime
        PrometheusService.nodejsUptime = new Gauge({
            name: 'nodejs_uptime_seconds',
            help: 'Node.js process uptime in seconds',
            registers: [this.registry],
        })

        // Метрики приложения
        PrometheusService.httpRequestsTotal = new Gauge({
            name: 'http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status'],
            registers: [this.registry],
        })
        PrometheusService.httpExeptionsRequestsTotal = new Gauge({
            name: 'http_exepctions_requests_total',
            help: 'Total number of HTTP exeptions requests',
            labelNames: ['method', 'route', 'status'],
            registers: [this.registry],
        })

        PrometheusService.rabbitRequestTotal = new Gauge({
            name: 'rabbit_requests_total',
            help: 'Total number of Rabbit requests',
            labelNames: ['pattern', 'status'],
            registers: [this.registry],
        })

        PrometheusService.rabbitRequestSendTotal = new Gauge({
            name: 'rabbit_requests_send_total',
            help: 'Total number of send Rabbit requests',
            labelNames: ['pattern'],
            registers: [this.registry],
        })

        PrometheusService.httpRequestsDuration = new Histogram({
            name: 'http_requests_duration',
            help: 'HTTP requests duration in seconds',
            labelNames: ['method', 'route', 'status'],
            registers: [this.registry],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
        })
        PrometheusService.rabbitRequestsDuration = new Histogram({
            name: 'rabbit_requests_duration',
            help: 'RabbitMQ requests duration in seconds',
            labelNames: ['pattern'],
            registers: [this.registry],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
        })

        // health
        PrometheusService.healthLastUpdateUnix = new Gauge({
            name: 'health_last_update_unix',
            help: 'Last update in unix time',
            registers: [this.registry],
        })
    }

    updateNodejsMetrics() {
        // Node
        PrometheusService.collectCpuMetrics()
        PrometheusService.collectMemoryMetrics()

        // Event Loop Lag
        const start = process.hrtime.bigint()
        setImmediate(() => {
            const lag = Number(process.hrtime.bigint() - start) / 1e9
            PrometheusService.nodejsEventLoopLag.set(lag)
        })

        // Uptime
        PrometheusService.nodejsUptime.set(process.uptime())
        PrometheusService.healthLastUpdateUnix.set(parseInt(Date.now() / 1000 as any))
    }

    async pushMetrics() {
        try {
            await this.pushgateway.delete({
                jobName: process.env.PUSHGATEWAY_APP,
                groupings: { instance: 'default', app: process.env.PUSHGATEWAY_APP + '_' + process.env.SERVER }
            })
            
            await this.pushgateway.pushAdd({
                jobName: process.env.PUSHGATEWAY_APP,
                groupings: { instance: 'default', app: process.env.PUSHGATEWAY_APP + '_' + process.env.SERVER }
            })
            this.clearMetrics()
        } catch (error) {
            LoggerService.error('Prometheus', `Failed to push metrics ${process.env.PUSHGATEWAY_APP + '_' + process.env.SERVER}`, error)
        }
    }

    recordHttpRequest(method: string, route: string, status: number, duration: number) {
        PrometheusService.httpRequestsTotal.labels({ method, route, status: status.toString() }).inc()
        PrometheusService.httpRequestsDuration.labels({ method, route, status: status.toString() }).observe(duration)
    }
    recordHttpExeptionsRequest(method: string, route: string, status: number) {
        PrometheusService.httpExeptionsRequestsTotal.labels({ method, route, status: status.toString() }).inc()
    }
    static recordRabbitRequest(pattern: string, status: boolean, duration: number) {
        this.rabbitRequestTotal.labels({ pattern, status: status.toString() }).inc()
        this.rabbitRequestsDuration.labels({ pattern }).observe(duration)
    }
    static recordRabbitSendRequest(pattern: string) {
        this.rabbitRequestSendTotal.labels({ pattern }).inc()
    }

    async clearMetrics() {
        (await PrometheusService.httpRequestsTotal.get()).values.forEach(metric => {
            const labels = metric.labels
            PrometheusService.httpRequestsTotal.labels(labels).set(0)
        });
        (await PrometheusService.httpExeptionsRequestsTotal.get()).values.forEach(metric => {
            const labels = metric.labels
            PrometheusService.httpExeptionsRequestsTotal.labels(labels).set(0)
        });
        (await PrometheusService.rabbitRequestTotal.get()).values.forEach(metric => {
            const labels = metric.labels
            PrometheusService.rabbitRequestTotal.labels(labels).set(0)
        });
        (await PrometheusService.rabbitRequestSendTotal.get()).values.forEach(metric => {
            const labels = metric.labels
            PrometheusService.rabbitRequestSendTotal.labels(labels).set(0)
        });
    }

    private static collectCpuMetrics() {
        const cpus = os.cpus()
    
        let totalIdle = 0
        let totalTick = 0

        cpus.forEach((cpu) => {
            for(const type in cpu.times) {
                totalTick += cpu.times[type]
            }
            totalIdle += cpu.times.idle
        })

        const totalUsage = ((totalTick - totalIdle) / totalTick) * 100
        
        this.cpuUsage.set({ type: 'total' }, totalUsage)
        this.cpuUsage.set({ type: 'user' }, calculateCpuUsage(cpus, 'user'))
        this.cpuUsage.set({ type: 'system' }, calculateCpuUsage(cpus, 'sys'))
        this.cpuUsage.set({ type: 'idle' }, calculateCpuUsage(cpus, 'idle'))
    }
    private static collectMemoryMetrics() {
        const systemMemory = os.totalmem()
        const systemFreeMemory = os.freemem()
        const systemUsedMemory = systemMemory - systemFreeMemory

        this.memoryInfo.set({ type: 'total' }, systemMemory)
        this.memoryInfo.set({ type: 'free' }, systemFreeMemory)
        this.memoryInfo.set({ type: 'used' }, systemUsedMemory)
        this.memoryInfo.set({ type: 'available' }, systemFreeMemory) // or os.freemem()

        const cpuUsage = process.cpuUsage()

        this.processCpu.set({ mode: 'user' }, cpuUsage.user / 1000000) // convert to seconds
        this.processCpu.set({ mode: 'system' }, cpuUsage.system / 1000000) // convert to seconds
    }
}