import log4js from './src/logging.js'
const logger = log4js.getLogger()

import { Command } from "commander";
const program = new Command()

import { checkMasterStatusAsync, getTaskAsync, updateTaskAsync } from './src/rest/masterAPI.js'
import { Socket } from './src/socket/socket.js';

import pMap from 'p-map';
import { IterableTask } from './src/tasking/iterableTasks.js'

program
    .name('ffmpeg cluster')
    .description('The cluster node for transcoding videos to vp9, this needs to connect to the master')
    .version('0.2.0')

program
    .command('start')
    .option('-m, --master-address <master address>', 'The master address')
    .option('-t, --threads [threads]', 'How many parallel threads to use for encoding')
    .description('Connect to the master and start processing')
    .action(async ({ masterAddress, threads = 4 }) => {
        // principle of operation
        {
            // connect to master

            // set name in socket

            // parallel processing
            {
                // fetch task

                // fetch file from URL
                // report to socket along the way

                // process with ffmpeg
                // report to socket along the way

                // upload to URL

                // report task
            }
        }

        const slaveName = 'temp'

        // important for identifying sessions in logs
        logger.info(`started slave ${slaveName} with ${threads} threads, master address: ${masterAddress}`)

        // connect to master
        try {
            logger.info(`trying to connect to master REST`)
            const { remainingTasks } = await checkMasterStatusAsync(masterAddress)
        } catch (error) {
            logger.error(`failed to connect to master REST, error:${error}`)
            return
        }

        logger.info(`trying to connect to master Websocket`)
        const socket = new Socket(masterAddress)
        await socket.connectAsync()
        logger.info(`connected to master Websocket`)

        // parallel processing
        const iterableTasks = new IterableTask({ masterAddress, slaveName })
        const parallelResults = await pMap(iterableTasks, async (task) => {
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

        }, { concurrency: threads })

        socket.close()
    })

program.parse()