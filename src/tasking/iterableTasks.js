import log4js from '../logging.js'
const logger = log4js.getLogger('task')

import { getTaskAsync } from "../rest/masterAPI.js"

// an iterable class that grabs task from the master
export class IterableTask {
    constructor({ masterAddress, slaveName }) {
        this.masterAddress = masterAddress
        this.slaveName = slaveName

        this.taskCount = 0
    }

    [Symbol.asyncIterator]() {
        return this
    }

    async next() {
        const RETRY_INTERVAL_S = 10
        while (true) {
            try {
                const task = await getTaskAsync(this.masterAddress, { slaveName: this.slaveName })

                this.taskCount++

                return {
                    value: task,
                    done: false
                }
            } catch (error) {
                logger.info(`failed to get task from master, error:${error}, retrying in ${RETRY_INTERVAL_S} seconds`)

                // wait 5 seconds before retrying
                await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_S * 1000))
            }
        }
    }
}