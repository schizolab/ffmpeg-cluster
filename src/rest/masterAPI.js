import log4js from '../logging.js'
const logger = log4js.getLogger('rest')

import got from 'got'

// use url join to handle slashes safely
import urlJoin from 'url-join';

export async function checkMasterStatus(serverAddress) {
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

export async function getTask(serverAddress, { slaveName }) {
    const url = urlJoin(serverAddress, 'task');

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

