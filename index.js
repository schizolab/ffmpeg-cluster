import log4js from './src/logging.js'
const logger = log4js.getLogger()

import { Command } from "commander";
const program = new Command()

import { checkMasterStatusAsync, getTaskAsync, updateTaskAsync } from './src/rest/masterAPI.js'
import { Socket } from './src/socket/socket.js';

import { IterableTasks } from './src/tasking/iterableTasks.js';

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

        // parallel processing
        const iterableTasks = new IterableTasks({ masterAddress, slaveName })
        // set name in socket
        // socket testing
        logger.info(`trying to connect to master Websocket`)
        const socket = new Socket(masterAddress)
        await socket.connectAsync()

        // set progress
        await socket.setProgressAsync({
            slaveName,
            taskId: 1,
            action: 'download',
            progressPercentage: 0
        })
        logger.info(`test set progress for task 1`)
    })

program.parse()