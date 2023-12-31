import 'dotenv/config'

import log4js from './src/logging.js'
const logger = log4js.getLogger()

import { Command } from "commander";
const program = new Command()

import { checkMasterStatusAsync, getTaskAsync, updateTaskAsync } from './src/rest/masterAPI.js'
import { Socket } from './src/socket/socket.js';

import pMap from 'p-map';
import { IterableTask } from './src/tasking/iterableTasks.js'
import { processTask } from './src/tasking/task.js';

import fs from 'fs'
import got from 'got'

program
    .name('ffmpeg cluster')
    .description('The cluster node for transcoding videos to vp9, this needs to connect to the master')
    .version('0.2.0')

program
    .command('start')
    .option('-m, --master-address <master address>', 'The master address')
    .option('-t, --threads [threads]', 'How many parallel threads to use for encoding', parseInt)
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

        const slaveName = process.env.SLAVE_NAME

        // important for identifying sessions in logs
        logger.info(`started slave ${slaveName} with ${threads} threads, master address: ${masterAddress}`)

        // connect to master
        try {
            const { remainingTasks } = await checkMasterStatusAsync(masterAddress)
            logger.info(`connected to master on REST endpoint`)
        } catch (error) {
            logger.error(`failed to connect to master REST, error:${error}`)
            return
        }

        const socket = new Socket(masterAddress)
        await socket.connectAsync()
        logger.info(`connected to master on Websocket endpoint`)

        // parallel processing
        const iterableTasks = new IterableTask({ masterAddress, slaveName })
        const parallelResults = await pMap(iterableTasks, async (task) => {
            // the iterable will return undefined when there are no more tasks
            if (!task) {
                return
            }

            let videoOutputPath = ''
            try {
                videoOutputPath = await processTask(
                    {
                        task,
                        slaveName
                    },
                    // progress callback
                    async ({ action, progressPercentage, fps }) => {
                        logger.info(`task ${task.taskId} progress: ${action} ${progressPercentage}% ${fps ? `${fps}fps` : ''}`)
                        await socket.setProgressAsync({
                            slaveName,
                            taskId: task.taskId,
                            action,
                            progressPercentage
                        })
                    }
                )
            } catch (error) {
                logger.error(`task ${task.taskId} failed, error:${error}`)
                // mark as failed if it can
                try {
                    await socket.setResultAsync({
                        slaveName,
                        taskId: task.taskId,
                        status: 'failed',
                        message: error.message
                    })
                } catch (error) {
                    logger.error(`failed to report task ${task.taskId} failure, error:${error}`)
                }

                return
            }

            // mark as complete
            await socket.setResultAsync({
                slaveName,
                taskId: task.taskId,
                status: 'completed',
            })
        }, { concurrency: threads })

        socket.close()
    })

program.parse()