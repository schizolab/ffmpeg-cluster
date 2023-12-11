import log4js from '../logging.js'
const logger = log4js.getLogger('socket')

import { io } from 'socket.io-client';

export class Socket {
    constructor(address) {
        this.socket = io(`ws://${address}`);
    }

    connectAsync() {
        return new Promise((resolve, reject) => {
            this.socket.on('connect', (socket) => {
                logger.info(`connected to master, socket id: ${this.socket.id}`);
                resolve();
            });
            this.socket.on('error', (error) => {
                logger.error(`failed to connect to master, error:${error}`);
                reject(error);
            });
        })
    }

    setNameAsync(name) {
        return new Promise((resolve, reject) => {
            this.socket.emit('set name', name, (response) => {
                if (response.success) {
                    logger.info(`set name to ${name}`);
                    resolve();
                } else {
                    reject(response.error);
                }
            });
        })
    }

}