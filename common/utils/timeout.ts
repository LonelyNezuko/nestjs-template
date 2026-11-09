export default async function timeout(msec: number = 1000) {
    return await new Promise((resolve) => {
        setTimeout(() => resolve(null), msec)
    })
}