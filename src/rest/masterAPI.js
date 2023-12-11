import log4js from '../logging.js'
const logger = log4js.getLogger('rest')

import got from 'got'

// use url join to handle slashes safely
import urlJoin from 'url-join';

export async function checkMasterStatusAsync(serverAddress) {
    const url = urlJoin(`http://${serverAddress}`, '/status');

    let status = null;
    try {
        status = await got(url, {
            timeout: {
                request: 2000
            }
        }).json();
    } catch (error) {
        logger.error(`failed to connect to master, error:${error}`);

        return {
            remainingTasks: 0
        }
    }

    const { remainingTasks } = status;
    logger.info(`master status: remainingTasks: ${remainingTasks}`);

    return status;
}

export async function getTaskAsync(serverAddress, { slaveName }) {
    const url = urlJoin(`http://${serverAddress}`, 'task');

    const task = await got(url, {
        json: {
            slaveName
        }
    }).json()

    // this is for better readability
    const { id, downloadURL, uploadURL, options } = task

    logger.info(`got task id:${id}`)

    return task
}

// status: 'done' | 'failed'
export async function updateTaskAsync(serverAddress, { slaveName, taskId, status }) {
    const url = urlJoin(`http://${serverAddress}`, `/task/${taskId}`);

    const { isUpdated } = await got.put(url, {
        json: {
            slaveName,
            status
        },
        retry: { // since processing take so much effort, we can't just throw it away
            limit: 5,
            statusCodes: [ // server errors
                500,
            ],
            errorCodes: [ // network errors
                'ETIMEDOUT',
                'ECONNRESET',
                'EADDRINUSE',
                'ECONNREFUSED',
                'EPIPE',
                'ENOTFOUND',
                'ENETUNREACH',
                'EAI_AGAIN'
            ],
        }
    }).json();

    if (status === 'updated task') {
        logger.info(`updated task id:${taskId}`) // Use taskId instead of id
    }
}
