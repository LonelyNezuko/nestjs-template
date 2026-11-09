import * as os from 'os'

export default function calculateCpuUsage(cpus: os.CpuInfo[], mode: string): number {
    const total = cpus.reduce((acc, cpu) => {
        const times = cpu.times as any
        return acc + (times[mode] || 0)
    }, 0)
    const totalAll = cpus.reduce((acc, cpu) => {
        return acc + Object.values(cpu.times).reduce((sum, time) => sum + time, 0)
    }, 0)
    
    return (total / totalAll) * 100
}