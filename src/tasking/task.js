import log4js from '../logging.js'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import got from 'got'
import { CoolDown } from './cooldown.js'
import { ffprobeAsync, transcodeVideoAsync } from '../ffmpeg/transcode.js'

const logger = log4js.getLogger()

const REPORT_COOLDOWN_MS = 200

async function prepFilePath(folder, fileName) {
    const downloadPath = path.join(folder, fileName)

    // create ./temp/videos recursively if it doesn't exist
    try {
        await fsPromises.access(folder)
    } catch (error) {
        await fsPromises.mkdir(folder, { recursive: true })
    }

    // delete file if it exists
    try {
        await fsPromises.access(downloadPath)
        try {
            await fsPromises.rm(downloadPath)
        } catch (error) { //remove failed(could be a problem)
            logger.error(`file remove failed: ${downloadPath}. ${error}`)
        }
    } catch (error) { // file doesn't exist

    }

    return downloadPath
}

async function downloadFile({ downloadURL, downloadPath }, progressCallbackAsync) {
    const reportCoolDown = new CoolDown(REPORT_COOLDOWN_MS)
    const cooledReportAsync = async (progress) => reportCoolDown.executeAsync(async () => {
        await progressCallbackAsync(progress)
    })

    await progressCallbackAsync({
        action: 'downloading file',
        progressPercentage: 0
    })

    // download file
    const downloadStream = got.stream(downloadURL)
    const writeStream = fs.createWriteStream(downloadPath)
    downloadStream.pipe(writeStream)
    await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve)
        writeStream.on('error', reject)
        // on write stream progress
        downloadStream.on('downloadProgress', ({ transferred, total, percent }) => {
            cooledReportAsync({ action: 'downloading file', progressPercentage: percent })
        })
    })

    await progressCallbackAsync({
        action: 'downloading file',
        progressPercentage: 100
    })

    return downloadPath
}

async function processFileAsync({ downloadPath, videoOutputPath }, progressCallbackAsync) {
    const reportCoolDown = new CoolDown(REPORT_COOLDOWN_MS)
    const cooledReportAsync = async (progress) => reportCoolDown.executeAsync(async () => {
        await progressCallbackAsync(progress)
    })

    // get video info
    await progressCallbackAsync({
        action: 'getting video info',
        progressPercentage: 0
    })
    const videoInfo = await ffprobeAsync(downloadPath)
    await progressCallbackAsync({
        action: 'getting video info',
        progressPercentage: 100
    })

    // set up transcode options
    // max 700p, 720p bad, 72=66+6
    let dimensionMultiplier = 1
    const maxDimension = Math.max(videoInfo.video.width, videoInfo.video.height)
    if (maxDimension > 700) {
        dimensionMultiplier = 700 / maxDimension
    }
    const videoQuality = 30 // use constant quality mode
    const audioSampleRate = Math.min(48000, videoInfo.audio.sampleRate)

    // transcode video
    await progressCallbackAsync({
        action: 'transcoding video',
        progressPercentage: 0
    })
    await transcodeVideoAsync(
        {
            inputFilePath: downloadPath,
            outputFilePath: videoOutputPath,
            video: {
                width: Math.round(videoInfo.video.width * dimensionMultiplier),
                height: Math.round(videoInfo.video.height * dimensionMultiplier),
                quality: videoQuality,
                isDeNoise: false
            },
            audio: {
                sampleRate: audioSampleRate
            }
        },
        async (progress) => cooledReportAsync(progress)
    )
    await progressCallbackAsync({
        action: 'transcoding video',
        progressPercentage: 100
    })
}

export async function processTask({ task, slaveName, progressCallbackAsync }) {
    // the iterable will return undefined when there are no more tasks
    if (!task) {
        return
    }

    const downloadPath = await prepFilePath('./temp/videos/downloads', `${task.taskId}.tmp`)
    await downloadFile({ downloadURL: task.downloadURL, downloadPath }, progressCallbackAsync)

    console.log('asf')
    const videoOutputPath = await prepFilePath('./temp/videos/transcodes', `${task.taskId}.webm`)
    await processFileAsync({ downloadPath, videoOutputPath }, progressCallbackAsync)
}