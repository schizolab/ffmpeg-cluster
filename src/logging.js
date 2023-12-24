import log4js from "log4js";

log4js.configure({
    appenders: {
        task: {
            type: 'file',
            filename: './logs/task.log',
        },
        debug: {
            type: 'file',
            filename: './logs/debug.log'
        },
        ui: {
            type: 'console'
        }
    },
    categories: {
        default: {
            appenders: ['ui'],
            level: 'trace'
        },
        rest: {
            appenders: ['debug', 'ui'],
            level: 'info'
        },
        socket: {
            appenders: ['debug', 'ui'],
            level: 'info'
        },
        task: {
            appenders: ['task', 'debug', 'ui'],
            level: 'info'
        }
    }
})

export default log4js