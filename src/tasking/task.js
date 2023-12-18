import log4js from '../logging.js'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import got from 'got'
import { CoolDown } from './cooldown.js'

const logger = log4js.getLogger()

const REPORT_COOLDOWN_MS = 200

async function prepFilePath(folder, fileName) {
    const downloadPath = path.join(folder, fileName)

    // create ./temp/videos recursively if it doesn't exist
    try {
        await fsPromises.access('./temp/videos')
    } catch (error) {
        await fsPromises.mkdir('./temp/videos', { recursive: true })
    }

    // delete file if it exists
    try {
        await fsPromises.access(downloadPath)
        await fsPromises.rm(downloadPath)
    } catch (error) {
        // file doesn't exist
    }

    return downloadPath
}

async function downloadFile(task, progressCallbackAsync) {
    const { taskId, downloadURL } = task

    const reportCoolDown = new CoolDown(REPORT_COOLDOWN_MS)
    const cooledReportAsync = async (action, progressPercentage) => reportCoolDown.executeAsync(async () => {
        await progressCallbackAsync(action, progressPercentage)
    })

    await progressCallbackAsync('prepping download path', 0)
    const downloadPath = await prepFilePath('./temp/videos', `${taskId}.tmp`)

    // download file
    const downloadStream = got.stream(downloadURL)
    const writeStream = fs.createWriteStream(downloadPath)
    downloadStream.pipe(writeStream)
    await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve)
        writeStream.on('error', reject)
        // on write stream progress
        downloadStream.on('downloadProgress', ({ transferred, total, percent }) => {
            cooledReportAsync('downloading file', percent)
        })
    })

    await progressCallbackAsync('downloading file', 100)

    return downloadPath
}

async function processFile({ downloadPath }) {
    const reportCoolDown = new CoolDown(REPORT_COOLDOWN_MS)
    const cooledReportAsync = async (action, progressPercentage) => reportCoolDown.executeAsync(async () => {
        await progressCallbackAsync(action, progressPercentage)
    })
}

export async function processTask({ task, slaveName, progressCallbackAsync }) {
    // the iterable will return undefined when there are no more tasks
    if (!task) {
        return
    }

    const downloadPath = await downloadFile(task, progressCallbackAsync)

}

await processTask({
    task: {
        taskId: '1234',
        downloadURL: 'http://192.168.2.93:9000/terry-source/numbered/video/1045.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ffmpeg-cluster-master%2F20231218%2Fdefault%2Fs3%2Faws4_request&X-Amz-Date=20231218T224432Z&X-Amz-Expires=3600&X-Amz-Signature=e7478affe67c0c6aeb187b382cf9e54d2eb37156e8b341373ef6a01d01017087&X-Amz-SignedHeaders=host&x-id=GetObject',
        uploadURL: 'http://192.168.2.93:9000/terry-hosting/1045.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ffmpeg-cluster-master%2F20231218%2Fdefault%2Fs3%2Faws4_request&X-Amz-Date=20231218T224432Z&X-Amz-Expires=3600&X-Amz-Signature=2e9d932141cef9b398922a58046ee29fad5969b2b5e246c501ec0c78c2c70aeb&X-Amz-SignedHeaders=host&x-id=PutObjec',
        options: {}
    },
    slaveName: 'temp',
    progressCallbackAsync: async (action, progressPercentage) => {
        console.log(action, progressPercentage)
    }
})