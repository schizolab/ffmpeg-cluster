const CPU_USED = 1

export function getOutputExtension() {
    switch (process.env.HW_ENCODER) {
        case 'videotoolbox':
            return '.mp4'
        case 'nvenc':
            return '.mp4'
        default:
            return '.webm'
    }
}

export function getFFMPEGCommand({ inputFilePath, isDeNoise, quality, width, outputFilePath }) {
    switch (process.env.HW_ENCODER) {
        // appleshit
        // I have a Macbook Air M2 as a normie machine
        // to leave totally innocuous browsing history to the big tech
        // which I believe is important for the future
        case 'videotoolbox':
            console.log('using videotoolbox')
            return `ffmpeg -i ${inputFilePath} \
            -c:v hevc_videotoolbox \
            -c:a libopus \
            -b:v 0 ${isDeNoise ? '-vf "hqdn3d=4:3:6:4" ' : ''}\
            -crf ${quality} \
            -q:v 2 \
            -auto-alt-ref 1 \
            -lag-in-frames 25 \
            -vf scale=${width}:-2 \
            -progress pipe:1 \
            -hide_banner \
            -loglevel error \
            ${outputFilePath}`
            break;
        case 'nvenc':

            break;
        default:
            return `ffmpeg -i ${inputFilePath} \
                    -c:v libvpx-vp9 \
                    -c:a libopus \
                    -cpu-used -${CPU_USED} \
                    -b:v 0 ${isDeNoise ? '-vf "hqdn3d=4:3:6:4" ' : ''}\
                    -crf ${quality} \
                    -q:v 2 \
                    -auto-alt-ref 1 \
                    -lag-in-frames 25 \
                    -vf scale=${width}:-2 \
                    -progress pipe:1 \
                    -hide_banner \
                    -loglevel error \
                    ${outputFilePath}`
            break;
    }
}