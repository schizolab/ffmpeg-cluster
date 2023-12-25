import log4js from '../logging.js'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import got from 'got'
import { CoolDown } from './cooldown.js'
import { ffprobeAsync, transcodeVideoAsync } from '../ffmpeg/transcode.js'

const logger = log4js.getLogger('task')

const REPORT_COOLDOWN_MS = 200

async function prepFilePath(folder, fileName) {
    const filePath = path.join(folder, fileName)

    // create ./temp/videos recursively if it doesn't exist
    try {
        await fsPromises.access(folder)
    } catch (error) {
        await fsPromises.mkdir(folder, { recursive: true })
    }

    await deleteFileAsync(filePath)

    return filePath
}

async function downloadFileAsync({ downloadURL, downloadPath }, progressCallbackAsync) {
    const reportCoolDown = new CoolDown(REPORT_COOLDOWN_MS)
    const cooledReportAsync = async (progress) => await reportCoolDown.executeAsync(async () => {
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
            cooledReportAsync({ action: 'downloading file', progressPercentage: percent * 100 })
                .catch((error) => {
                    reject(error)
                })
        })
        downloadStream.on('error', reject)
    })

    await progressCallbackAsync({
        action: 'downloading file',
        progressPercentage: 100
    })

    return downloadPath
}

async function transcodeFileAsync({ downloadPath, videoOutputPath }, progressCallbackAsync) {
    const reportCoolDown = new CoolDown(REPORT_COOLDOWN_MS)
    const cooledReportAsync = async (progress) => await reportCoolDown.executeAsync(async () => {
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
    if (process.env.ANTI_666) {
        const minDimension = Math.min(videoInfo.video.width, videoInfo.video.height)
        if (minDimension > 700) {
            dimensionMultiplier = 700 / minDimension
        }
    }

    // quality
    const videoQuality = 30 // use constant quality mode
    const audioSampleRate = Math.min(48000, videoInfo.audio.sampleRate)

    // transcode video
    await progressCallbackAsync({
        action: 'transcoding video',
        progressPercentage: 0
    })
    try {
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
            async (progress) => await cooledReportAsync(progress)
        )
    } catch (error) {
        logger.error(`transcode failed: ${error}`)
        throw error
    }
    await progressCallbackAsync({
        action: 'transcoding video',
        progressPercentage: 100
    })
}

async function uploadFileAsync({ videoOutputPath, uploadURL }, progressCallbackAsync) {
    const reportCoolDown = new CoolDown(REPORT_COOLDOWN_MS)
    const cooledReportAsync = async (progress) => await reportCoolDown.executeAsync(async () => {
        await progressCallbackAsync(progress)
    })

    // length is specifically required for upload
    const contentLength = await new Promise((resolve, reject) => {
        fs.stat(videoOutputPath, (error, stats) => {
            if (error) {
                reject(error)
            } else {
                resolve(stats.size)
            }
        })
    })

    const fileStream = fs.createReadStream(videoOutputPath)

    const uploadStream = got.stream.put(uploadURL, {
        headers: {
            'content-length': contentLength
        }
    })
    fileStream.pipe(uploadStream)
    await new Promise((resolve, reject) => {
        uploadStream.on('finish', resolve)
        uploadStream.on('error', reject)
        // on read stream progress
        uploadStream.on('uploadProgress', ({ transferred, total, percent }) => {
            cooledReportAsync({ action: 'uploading file', progressPercentage: percent * 100 })
                .catch((error) => {
                    reject(error)
                })
        })
    })

    await progressCallbackAsync({
        action: 'uploading file',
        progressPercentage: 100
    })
}

async function deleteFileAsync(filePath) {
    // delete file if it exists
    try {
        await fsPromises.access(filePath)
        try {
            await fsPromises.rm(filePath)
        } catch (error) { //remove failed(could be a problem)
            logger.error(`file remove failed: ${filePath}. ${error}`)
        }
    } catch (error) { // file doesn't exist

    }
}

export async function processTask({ task, slaveName }, progressCallbackAsync) {
    const downloadPath = await prepFilePath('./temp/videos/downloads', `${task.taskId}.tmp`)
    const videoOutputPath = await prepFilePath('./temp/videos/transcodes', `${task.taskId}.webm`)

    try {
        await downloadFileAsync({ downloadURL: task.downloadURL, downloadPath }, progressCallbackAsync)

        await transcodeFileAsync({ downloadPath, videoOutputPath }, progressCallbackAsync)

        await uploadFileAsync({ videoOutputPath, uploadURL: task.uploadURL }, progressCallbackAsync)

    } catch (error) {
        throw error
    } finally {
        await deleteFileAsync(downloadPath)
        await deleteFileAsync(videoOutputPath)
    }

    return videoOutputPath
}
