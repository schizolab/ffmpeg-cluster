import { getTaskAsync } from "../rest/masterAPI.js"

// an iterable class that grabs task from the master
export class IterableTask {
    constructor({ masterAddress, slaveName }) {
        this.masterAddress = masterAddress
        this.slaveName = slaveName
    }

    [Symbol.asyncIterator]() {
        return this
    }

    async next() {
        try {
            const task = await getTaskAsync(this.masterAddress, { slaveName: this.slaveName })

            return {
                value: task,
                done: false
            }
        } catch (error) {
            return {
                value: undefined,
                done: true
            }
        }

    }
}