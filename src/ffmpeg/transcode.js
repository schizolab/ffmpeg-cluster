import { promisify } from 'util';
import { exec } from 'child_process';

import { getFFMPEGCommand } from './commands.js';

const CPU_USED = 1;

export async function transcodeVideoAsync({
    inputFilePath,
    outputFilePath,
    video: { width, height, quality, isDeNoise },
    audio: { sampleRate },
}, progressCallbackAsync) {
    const ffmpegCPU = getFFMPEGCommand({
        inputFilePath,
        CPU_USED,
        isDeNoise,
        quality,
        width,
        outputFilePath
    });

    const ffmpegNvidia = `
    `

    // get video length
    const ffprobed = await ffprobeAsync(inputFilePath)

    return new Promise(async (resolve, reject) => {
        const ffmpegProcess = exec(ffmpegCPU);

        ffmpegProcess.stdout.on('data', (data) => {
            const progress = parseProgress(data);
            progressCallbackAsync({
                action: 'transcoding video',
                progressPercentage: progress.outTimeUs / 1000000 / ffprobed.video.duration * 100,
                fps: progress.fps,
            }).catch((error) => {
                ffmpegProcess.kill();
                reject(error);
            })
        });

        ffmpegProcess.stderr.on('data', (error) => {
            reject(new Error(error));
        });

        ffmpegProcess.on('exit', (code) => {
            if (code === 0) {
                resolve({
                    outputFilePath
                });
            } else {
                reject(new Error(`FFmpeg process exited with code ${code}`));
            }
        });
    });
}

function parseProgress(data) {
    const lines = data.trim().split('\n');
    const progress = {};

    for (const line of lines) {
        const [key, value] = line.split('=');
        progress[key] = value;
    }

    const parsedProgress = {
        outTimeUs: Number.parseInt(progress.out_time_us),
        fps: Number.parseFloat(progress.fps),
    }
    return parsedProgress;
}

export async function ffprobeAsync(file) {
    return new Promise((resolve, reject) => {
        const ffprobeProcess = exec(`ffprobe -v quiet -print_format json -show_format -show_streams ${file}`);

        let output = '';

        ffprobeProcess.stdout.on('data', (data) => {
            output += data;
        });

        ffprobeProcess.stderr.on('data', (error) => {
            reject(new Error(error));
        });

        ffprobeProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(output);
                    resolve(parseFFProbe(result));
                } catch (error) {
                    reject(new Error('Failed to parse ffprobe output'));
                }
            } else {
                reject(new Error(`ffprobe process exited with code ${code}`));
            }
        });
    });
}

function parseFFProbe(ffprobe) {
    return {
        video: {
            duration: Number.parseFloat(ffprobe.format.duration),
            width: Number.parseInt(ffprobe.streams[0].width),
            height: Number.parseInt(ffprobe.streams[0].height),
            fps: Number.parseFloat(ffprobe.streams[0].r_frame_rate.split('/')[0]),
            bitRate: Number.parseInt(ffprobe.format.bit_rate),
        },
        audio: {
            channels: Number.parseInt(ffprobe.streams[1].channels),
            sampleRate: Number.parseInt(ffprobe.streams[1].sample_rate),
        }
    }
}
