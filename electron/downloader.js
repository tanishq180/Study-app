import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import https from 'node:https';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { app } = require('electron');

// Active child processes mapped by download ID
const activeDownloads = new Map();

function getUserDataBin() {
  const isWin = process.platform === 'win32';
  const binName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
  try {
    if (app && typeof app.getPath === 'function') {
      return path.join(app.getPath('userData'), 'bin', binName);
    }
  } catch (_) {}
  const fallbackDir = process.env.APPDATA || os.homedir();
  return path.join(fallbackDir, 'study-hub', 'bin', binName);
}

/**
 * Returns potential yt-dlp executable commands or paths.
 */
export function getYtDlpCommand() {
  const isWin = process.platform === 'win32';
  const userDataBin = getUserDataBin();

  // 1. Check local userData binary
  if (fs.existsSync(userDataBin)) {
    return { cmd: userDataBin, args: [] };
  }

  // 2. Check Python user scripts folder on Windows
  if (isWin) {
    const userProfile = process.env.USERPROFILE || '';
    const pyScript = path.join(userProfile, 'AppData', 'Roaming', 'Python', 'Python314', 'Scripts', 'yt-dlp.exe');
    if (fs.existsSync(pyScript)) {
      return { cmd: pyScript, args: [] };
    }
    // Generic Python Scripts search
    const roamingPy = path.join(userProfile, 'AppData', 'Roaming', 'Python');
    if (fs.existsSync(roamingPy)) {
      try {
        const dirs = fs.readdirSync(roamingPy);
        for (const d of dirs) {
          const testPath = path.join(roamingPy, d, 'Scripts', 'yt-dlp.exe');
          if (fs.existsSync(testPath)) {
            return { cmd: testPath, args: [] };
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }

  // 3. Fallback to python -m yt_dlp
  return { cmd: 'python', args: ['-m', 'yt_dlp'] };
}

/**
 * Download standalone yt-dlp binary if missing.
 */
export async function ensureYtDlpInstalled(onProgress) {
  const isWin = process.platform === 'win32';
  const targetFile = getUserDataBin();
  const binDir = path.dirname(targetFile);

  if (fs.existsSync(targetFile)) {
    return targetFile;
  }

  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const downloadUrl = isWin
    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

  return new Promise((resolve, reject) => {
    function fetchWithRedirect(url) {
      https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchWithRedirect(res.headers.location);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download yt-dlp: HTTP ${res.statusCode}`));
          return;
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        const fileStream = fs.createWriteStream(targetFile);

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0 && onProgress) {
            onProgress(Math.round((downloadedBytes / totalBytes) * 100));
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          if (!isWin) {
            try {
              fs.chmodSync(targetFile, 0o755);
            } catch (_) {}
          }
          resolve(targetFile);
        });

        fileStream.on('error', (err) => {
          fs.unlink(targetFile, () => {});
          reject(err);
        });
      }).on('error', reject);
    }

    fetchWithRedirect(downloadUrl);
  });
}

/**
 * Fetch video info and available quality options.
 */
export function fetchVideoInfo(url) {
  return new Promise((resolve, reject) => {
    const { cmd, args } = getYtDlpCommand();
    const finalArgs = [
      ...args,
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      '--skip-download',
      url
    ];

    const child = spawn(cmd, finalArgs);
    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderrData || `yt-dlp exited with error code ${code}`));
      }

      try {
        const info = JSON.parse(stdoutData.trim());
        const durationSec = info.duration || 0;
        const mins = Math.floor(durationSec / 60);
        const secs = durationSec % 60;
        const durationFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

        // Format resolution list
        const resolutions = [
          { label: 'Best Quality (Auto)', value: 'best', ext: 'mp4' },
          { label: '1080p Full HD', value: '1080', ext: 'mp4' },
          { label: '720p HD', value: '720', ext: 'mp4' },
          { label: '480p SD', value: '480', ext: 'mp4' },
          { label: '360p Low', value: '360', ext: 'mp4' }
        ];

        const audioFormats = [
          { label: 'Audio Only - MP3 (High Quality)', value: 'mp3', ext: 'mp3' },
          { label: 'Audio Only - M4A', value: 'm4a', ext: 'm4a' },
          { label: 'Audio Only - Best Native', value: 'bestaudio', ext: 'm4a' }
        ];

        resolve({
          id: info.id,
          title: info.title,
          channel: info.uploader || info.channel || 'Unknown Channel',
          thumbnail: info.thumbnail || `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg`,
          duration: durationSec,
          durationFormatted,
          viewCount: info.view_count || 0,
          videoFormats: resolutions,
          audioFormats: audioFormats
        });
      } catch (e) {
        reject(new Error(`Failed to parse video info: ${e.message}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Execute media download with live progress reporting.
 */
export function startMediaDownload(options, onProgress) {
  return new Promise((resolve, reject) => {
    const { id, url, formatType, quality, outputDir } = options;
    const { cmd, args } = getYtDlpCommand();

    // Default download directory: user's Downloads directory
    let defaultDownloadDir = path.join(os.homedir(), 'Downloads');
    try {
      if (app && typeof app.getPath === 'function') {
        defaultDownloadDir = app.getPath('downloads');
      }
    } catch (_) {}

    const destDir = outputDir && fs.existsSync(outputDir)
      ? outputDir
      : defaultDownloadDir;

    const outputTemplate = path.join(destDir, '%(title)s [%(id)s].%(ext)s');

    const downloadArgs = [
      ...args,
      '--newline',
      '--no-playlist',
      '--progress-template',
      'AGY_PROGRESS|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress._total_bytes_str)s|%(progress.filename)s',
      '-o',
      outputTemplate
    ];

    if (formatType === 'audio') {
      if (quality === 'mp3') {
        downloadArgs.push('-x', '--audio-format', 'mp3');
      } else if (quality === 'm4a') {
        downloadArgs.push('-x', '--audio-format', 'm4a');
      } else {
        downloadArgs.push('-f', 'bestaudio/best');
      }
    } else {
      // Video
      if (quality === 'best') {
        downloadArgs.push('-f', 'bestvideo+bestaudio/best');
      } else {
        const height = parseInt(quality, 10) || 720;
        downloadArgs.push('-f', `bestvideo[height<=?${height}]+bestaudio/best[height<=?${height}]/best`);
      }
      downloadArgs.push('--merge-output-format', 'mp4');
    }

    downloadArgs.push(url);

    const child = spawn(cmd, downloadArgs);
    activeDownloads.set(id, child);

    let finalFilePath = '';
    let stderrData = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      const lines = text.split(/\r?\n/);

      for (const line of lines) {
        if (line.includes('AGY_PROGRESS|')) {
          const parts = line.split('|');
          if (parts.length >= 5) {
            const percentStr = parts[1].replace('%', '').trim();
            const speed = parts[2].trim();
            const eta = parts[3].trim();
            const totalBytes = parts[4].trim();
            const filename = parts[5] ? parts[5].trim() : '';

            if (filename && !finalFilePath) {
              finalFilePath = filename;
            }

            const percent = parseFloat(percentStr) || 0;
            if (onProgress) {
              onProgress({
                id,
                percent,
                speed: speed || 'Calculating...',
                eta: eta || 'Calculating...',
                size: totalBytes || '',
                status: 'downloading'
              });
            }
          }
        } else if (line.includes('[download] Destination:') || line.includes('[Merger] Merging formats into')) {
          const match = line.match(/(?:Destination: |into ")(.*?)(?:"|$)/);
          if (match && match[1]) {
            finalFilePath = match[1];
          }
        }
      }
    });

    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    child.on('close', (code) => {
      activeDownloads.delete(id);
      if (code === 0) {
        resolve({
          id,
          filePath: finalFilePath || path.join(destDir, 'Downloaded Video.mp4'),
          destDir
        });
      } else {
        reject(new Error(stderrData || `Download process exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      activeDownloads.delete(id);
      reject(err);
    });
  });
}

/**
 * Cancel an ongoing download.
 */
export function cancelMediaDownload(id) {
  const child = activeDownloads.get(id);
  if (child) {
    try {
      child.kill('SIGTERM');
      activeDownloads.delete(id);
      return true;
    } catch (e) {
      console.error(`Failed to kill download process ${id}:`, e);
    }
  }
  return false;
}
