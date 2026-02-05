const ffmpegPath = require('ffmpeg-static');
const { execFile } = require('child_process');
const path = require('path');

const framesDirName = process.argv[2] || 'frames_16x9_dark';
const fps = Number(process.argv[3] || 60);
const outputName = process.argv[4] || 'output_with_alpha.mov';

const framesDir = path.join(__dirname, framesDirName);
const outputFile = path.join(__dirname, outputName);

console.log(`Using FFmpeg at: ${ffmpegPath}`);

const args = [
    '-framerate', String(Number.isFinite(fps) ? fps : 60),
    '-i', path.join(framesDir, 'frame_%04d.png'),
    '-c:v', 'prores_ks',
    '-profile:v', '4444',
    '-pix_fmt', 'yuva444p10le',
    '-y', // Overwrite output
    outputFile
];

console.log(`Running FFmpeg...`);
execFile(ffmpegPath, args, (error, stdout, stderr) => {
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('FFmpeg output:', stdout);
    console.log('FFmpeg stderr:', stderr); // FFmpeg logs to stderr usually
    console.log(`Video saved to: ${outputFile}`);
});
