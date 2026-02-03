const ffmpegPath = require('ffmpeg-static');
const { execFile } = require('child_process');
const path = require('path');

const framesDir = path.join(__dirname, 'frames');
const outputFile = path.join(__dirname, 'output_with_alpha.mov');

console.log(`Using FFmpeg at: ${ffmpegPath}`);

const args = [
    '-framerate', '30',
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
