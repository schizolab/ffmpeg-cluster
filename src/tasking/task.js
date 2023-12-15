import log4js from '../logging.js'
const logger = log4js.getLogger()

export async function processTask({ task, slaveName, socket }) {
    // the iterable will return undefined when there are no more tasks
    if (!task) {
        return
    }

    const { taskId, downloadURL, uploadURL, options } = task

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    const setProgressAsync = async (action, progressPercentage) => {
        try {
            await socket.setProgressAsync({
                slaveName,
                taskId,
                action,
                progressPercentage
            })
        } catch (error) {
            logger.error(`failed to set progress for task ${taskId}, error:${error}`)
        }
    }

    setProgressAsync('starting', 0)
    await delay(1000)

    // fetch file from URL
    setProgressAsync('fetching file', 10)
    await delay(1000)

    // process with ffmpeg
    setProgressAsync('transcoding', 20)
    await delay(1000)

    // upload to URL
    setProgressAsync('uploading file', 90)
    await delay(1000)

    // finishing up
    setProgressAsync('finishing', 100)
    await delay(1000)
}