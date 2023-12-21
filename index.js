import log4js from './src/logging.js'
const logger = log4js.getLogger()

import { Command } from "commander";
const program = new Command()

import { checkMasterStatusAsync, getTaskAsync, updateTaskAsync } from './src/rest/masterAPI.js'
import { Socket } from './src/socket/socket.js';

import pMap from 'p-map';
import { IterableTask } from './src/tasking/iterableTasks.js'
import { processTask } from './src/tasking/task.js';

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

        const slaveName = 'temp'

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
            // await processTask({
            //     task: {
            //         taskId: 'test',
            //         downloadURL: 'http://192.168.2.93:9000/terry-source/numbered/video/1047.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ffmpeg-cluster-master%2F20231220%2Fdefault%2Fs3%2Faws4_request&X-Amz-Date=20231220T200715Z&X-Amz-Expires=3600&X-Amz-Signature=d3383b7e9aceb374f7d605af59d5d9e31f9b7c818ea2684364405679ec4df6f4&X-Amz-SignedHeaders=host&x-id=GetObject',
            //         uploadURL: 'http://192.168.2.93:9000/terry-hosting/1045.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ffmpeg-cluster-master%2F20231218%2Fdefault%2Fs3%2Faws4_request&X-Amz-Date=20231218T224432Z&X-Amz-Expires=3600&X-Amz-Signature=2e9d932141cef9b398922a58046ee29fad5969b2b5e246c501ec0c78c2c70aeb&X-Amz-SignedHeaders=host&x-id=PutObjec',
            //         options: {}
            //     },
            //     slaveName: 'temp',
            //     progressCallbackAsync: async (progress) => {
            //         console.log(JSON.stringify(progress))
            //     }
            // })

            await processTask({
                task,
                slaveName,
                progressCallbackAsync: async ({ action, progressPercentage, fps }) => {
                    try {
                        await socket.setProgressAsync({
                            slaveName,
                            taskId: task.taskId,
                            action,
                            progressPercentage
                        })
                    } catch (error) {
                        logger.error(`failed to set progress for task ${taskId}, error:${error}`)
                    }
                }
            })

            // mark as complete
            await socket.setProgressAsync({
                slaveName,
                taskId: task.taskId,
                action: 'completing task', // master marks task as complete when it receives 'completing task'
                progressPercentage: 100
            })
        }, { concurrency: threads })

        socket.close()
    })

program.parse()