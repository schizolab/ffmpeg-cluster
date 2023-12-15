import log4js from '../logging.js'
const logger = log4js.getLogger('task')

import { getTaskAsync } from "../rest/masterAPI.js"

const TEMP_MAX_TASKS = 2

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
        try {
            if (this.taskCount >= TEMP_MAX_TASKS) {
                return {
                    value: undefined,
                    done: true
                }
            }

            const task = await getTaskAsync(this.masterAddress, { slaveName: this.slaveName })

            this.taskCount++

            return {
                value: task,
                done: false
            }
        } catch (error) {
            logger.error(`failed to get task from master, error:${error}`)
            return {
                value: undefined,
                done: true
            }
        }
    }
}