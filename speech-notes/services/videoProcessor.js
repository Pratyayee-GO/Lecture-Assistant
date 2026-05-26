const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// Try to use system ffmpeg first, fallback to installed binary
let ffmpegPath;
try {
  ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  ffmpeg.setFfmpegPath(ffmpegPath);
  console.log('Using bundled ffmpeg:', ffmpegPath);
} catch (err) {
  // Fallback to system ffmpeg (common on Raspberry Pi)
  console.log('Bundled ffmpeg not available, using system ffmpeg');
  // fluent-ffmpeg will auto-detect system ffmpeg
}

const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

/**
 * Extract N evenly-spaced frames from a video file.
 * Gracefully degrades to returning [] if ffmpeg is unavailable or disabled.
 * Set env DISABLE_VIDEO_FRAMES=true to skip extraction entirely (useful on a Pi with broken dpkg / missing ffmpeg).
 *
 * @param {string} videoPath - absolute path to video file
 * @param {number} frameCount - number of frames to extract (default 8)
 * @returns {Promise<string[]>} - array of base64-encoded PNG images (may be empty on degradation)
 */
async function extractKeyFrames(videoPath, frameCount = 8) {
  // Fast escape if feature disabled
  if (process.env.DISABLE_VIDEO_FRAMES === 'true') {
    console.warn('[videoProcessor] Frame extraction disabled via DISABLE_VIDEO_FRAMES');
    return [];
  }

  // If ffmpeg was not successfully loaded (path missing) just return []
  if (!ffmpegPath && process.env.ALLOW_FRAME_FALLBACK !== 'false') {
    console.warn('[videoProcessor] ffmpeg binary unavailable – returning empty frame list');
    return [];
  }

  return new Promise((resolve, reject) => {
    const tempDir = path.join(path.dirname(videoPath), 'temp_frames');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // Get video duration first
    ffmpeg.ffprobe(videoPath, async (err, metadata) => {
      if (err) {
        console.warn('[videoProcessor] ffprobe failed, returning empty frames:', err.message);
        // Graceful fallback instead of hard failure
        return resolve([]);
      }
      
      const duration = metadata.format.duration;
      if (!duration || duration < 1) {
        return reject(new Error('Video too short or invalid'));
      }

      const interval = duration / (frameCount + 1);
      const timestamps = [];
      for (let i = 1; i <= frameCount; i++) {
        timestamps.push(interval * i);
      }

      const frameFiles = [];
      let completed = 0;

      // Extract each frame
      for (let i = 0; i < timestamps.length; i++) {
        const framePath = path.join(tempDir, `frame_${Date.now()}_${i}.png`);
        frameFiles.push(framePath);

        ffmpeg(videoPath)
          .seekInput(timestamps[i])
          .frames(1)
          .output(framePath)
          .on('end', async () => {
            completed++;
            if (completed === timestamps.length) {
              // All frames extracted, read and convert to base64
              try {
                const base64Frames = [];
                for (const file of frameFiles) {
                  if (fs.existsSync(file)) {
                    const buffer = await readFile(file);
                    base64Frames.push(buffer.toString('base64'));
                    await unlink(file).catch(() => {});
                  }
                }
                // Clean up temp dir
                try { fs.rmdirSync(tempDir); } catch {}
                resolve(base64Frames);
              } catch (readErr) {
                reject(new Error('Failed to read frames: ' + readErr.message));
              }
            }
          })
          .on('error', (ffmpegErr) => {
            console.warn('[videoProcessor] FFmpeg extraction error (degrading to partial/empty set):', ffmpegErr.message);
            // Resolve with what we have so far instead of failing entire request (no async/await inside this handler)
            try {
              const base64Frames = [];
              for (const file of frameFiles) {
                if (fs.existsSync(file)) {
                  try {
                    const buffer = fs.readFileSync(file);
                    base64Frames.push(buffer.toString('base64'));
                  } catch {}
                  try { fs.unlinkSync(file); } catch {}
                }
              }
              try { fs.rmdirSync(tempDir); } catch {}
              resolve(base64Frames);
            } catch (nestedErr) {
              resolve([]);
            }
          })
          .run();
      }
    });
  });
}

module.exports = { extractKeyFrames };
