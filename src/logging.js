import log4js from "log4js";

log4js.configure({
    appenders: {
        console: {
            type: 'console'
        },
        file: {
            type: 'file',
            filename: './logs/debug.log'
        }
    },
    categories: {
        default: {
            appenders: ['console'],
            level: 'trace'
        },
        rest: {
            appenders: ['console', 'file'],
            level: 'info'
        },
        socket: {
            appenders: ['console'],
            level: 'trace'
        },
        task: {
            appenders: ['console', 'file'],
            level: 'info'
        },
        ffmpeg: {
            appenders: ['console', 'file'],
            level: 'info'
        }
    }
})

export default log4js