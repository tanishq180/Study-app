import os
import sys
import shutil
import threading
from pathlib import Path
from typing import Callable, Optional
import yt_dlp

# Active download tasks mapped by download ID
active_tasks = {}

def get_ffmpeg_path() -> Optional[str]:
    """
    Finds ffmpeg binary from system PATH or bundled imageio-ffmpeg.
    """
    p = shutil.which("ffmpeg")
    if p:
        return p
    try:
        import imageio_ffmpeg
        exe = imageio_ffmpeg.get_ffmpeg_exe()
        if exe and os.path.exists(exe):
            return exe
    except Exception:
        pass
    return None

def get_base_ydl_opts() -> dict:
    """
    Configures common yt-dlp options including ffmpeg and JavaScript runtime.
    """
    opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False
    }

    # Pass ffmpeg path if available
    ffmpeg_exe = get_ffmpeg_path()
    if ffmpeg_exe:
        opts['ffmpeg_location'] = ffmpeg_exe

    # Configure JS runtime (Node.js) for YouTube player challenges
    node_exe = shutil.which("node")
    if node_exe:
        opts['js_runtimes'] = {'node': {'path': node_exe}}
        opts['remote_components'] = ['ejs:github']

    return opts

def get_video_info(url: str) -> dict:
    """
    Extracts video metadata and quality formats using yt-dlp Python API.
    """
    ydl_opts = get_base_ydl_opts()
    ydl_opts['skip_download'] = True

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                raise ValueError("Could not extract video metadata from URL")

            # Check if this is an active live stream
            if info.get('is_live') or info.get('live_status') == 'is_live':
                return {
                    "success": False,
                    "error": "This video is currently an active live stream. Live streams cannot be downloaded until the stream concludes."
                }

            duration_val = info.get('duration') or 0
            try:
                total_duration = int(float(duration_val))
                hours = total_duration // 3600
                mins = (total_duration % 3600) // 60
                secs = total_duration % 60
                if hours > 0:
                    duration_formatted = f"{hours}:{mins:02d}:{secs:02d}"
                else:
                    duration_formatted = f"{mins}:{secs:02d}"
            except Exception:
                total_duration = 0
                duration_formatted = "00:00"

            thumbnail = info.get('thumbnail') or f"https://i.ytimg.com/vi/{info.get('id', '')}/hqdefault.jpg"

            video_formats = [
                {"label": "Best Quality (Auto)", "value": "best", "ext": "mp4"},
                {"label": "1080p Full HD", "value": "1080", "ext": "mp4"},
                {"label": "720p HD", "value": "720", "ext": "mp4"},
                {"label": "480p SD", "value": "480", "ext": "mp4"},
                {"label": "360p Low", "value": "360", "ext": "mp4"}
            ]

            audio_formats = [
                {"label": "Audio Only - MP3 (High Quality)", "value": "mp3", "ext": "mp3"},
                {"label": "Audio Only - M4A", "value": "m4a", "ext": "m4a"},
                {"label": "Audio Only - Best Native", "value": "bestaudio", "ext": "m4a"}
            ]

            return {
                "success": True,
                "data": {
                    "id": info.get('id', ''),
                    "title": info.get('title', 'Unknown Title'),
                    "channel": info.get('uploader') or info.get('channel') or 'Unknown Channel',
                    "thumbnail": thumbnail,
                    "duration": total_duration,
                    "durationFormatted": duration_formatted,
                    "viewCount": info.get('view_count') or 0,
                    "videoFormats": video_formats,
                    "audioFormats": audio_formats
                }
            }
    except Exception as e:
        err_str = str(e)
        if "live stream recording is not available" in err_str.lower() or "is a live stream" in err_str.lower():
            clean_err = "This URL is an ongoing live stream. YouTube only allows downloading completed videos, not active 24/7 streams."
        else:
            clean_err = err_str
        print(f"[Downloader] Error fetching info: {clean_err}")
        return {"success": False, "error": clean_err}

def _format_bytes(num_bytes: Optional[float]) -> str:
    if not num_bytes:
        return ""
    try:
        nb = float(num_bytes)
        for unit in ['B', 'KiB', 'MiB', 'GiB']:
            if abs(nb) < 1024.0:
                return f"{nb:3.1f} {unit}"
            nb /= 1024.0
        return f"{nb:.1f} TiB"
    except Exception:
        return ""

def _format_speed(speed_bytes: Optional[float]) -> str:
    if not speed_bytes:
        return "..."
    try:
        formatted = _format_bytes(speed_bytes)
        return f"{formatted}/s" if formatted else "..."
    except Exception:
        return "..."

def _format_eta(seconds: Optional[float]) -> str:
    if not seconds:
        return "..."
    try:
        total_sec = int(float(seconds))
        hours = total_sec // 3600
        mins = (total_sec % 3600) // 60
        secs = total_sec % 60
        if hours > 0:
            return f"{hours:02d}:{mins:02d}:{secs:02d}"
        return f"{mins:02d}:{secs:02d}"
    except Exception:
        return "..."

def start_download(
    options: dict,
    on_progress: Callable[[dict], None],
    on_complete: Callable[[str, str], None],
    on_error: Callable[[str, str], None]
):
    """
    Spawns background download thread using yt-dlp.
    """
    download_id = options.get('id', '')
    url = options.get('url', '')
    format_type = options.get('formatType', 'video')
    quality = options.get('quality', 'best')
    output_dir = options.get('outputDir') or str(Path.home() / "Downloads")

    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    abort_event = threading.Event()
    active_tasks[download_id] = abort_event

    def worker():
        final_filename = ""
        captured_file_path = ""

        def progress_hook(d):
            nonlocal final_filename, captured_file_path
            if abort_event.is_set():
                raise Exception("Download cancelled by user")

            status = d.get('status')
            if status == 'downloading':
                fn = d.get('filename') or ''
                if fn and not final_filename:
                    final_filename = fn

                downloaded = d.get('downloaded_bytes') or 0
                total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
                percent = (downloaded / total * 100) if total > 0 else 0.0

                speed_val = d.get('speed')
                eta_val = d.get('eta')

                on_progress({
                    "id": download_id,
                    "percent": round(percent, 1),
                    "speed": _format_speed(speed_val),
                    "eta": _format_eta(eta_val),
                    "size": _format_bytes(total or downloaded),
                    "status": "downloading"
                })
            elif status == 'finished':
                fn = d.get('filename') or ''
                if fn:
                    captured_file_path = fn
                    final_filename = fn
                on_progress({
                    "id": download_id,
                    "percent": 100.0,
                    "speed": "Processing...",
                    "eta": "00:00",
                    "size": "",
                    "status": "processing"
                })

        ydl_opts = get_base_ydl_opts()
        ydl_opts.update({
            'outtmpl': os.path.join(output_dir, '%(title)s [%(id)s].%(ext)s'),
            'progress_hooks': [progress_hook],
            'noplaylist': True
        })

        ffmpeg_exe = get_ffmpeg_path()

        if format_type == 'audio':
            if quality == 'mp3':
                if ffmpeg_exe:
                    ydl_opts['format'] = 'bestaudio/best'
                    ydl_opts['postprocessors'] = [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'mp3',
                        'preferredquality': '192',
                    }]
                else:
                    ydl_opts['format'] = 'bestaudio[ext=m4a]/bestaudio/best'
            elif quality == 'm4a':
                ydl_opts['format'] = 'bestaudio[ext=m4a]/bestaudio/best'
            else:
                ydl_opts['format'] = 'bestaudio/best'
        else:
            # Video
            if quality == 'best':
                if ffmpeg_exe:
                    ydl_opts['format'] = 'bestvideo+bestaudio/best'
                    ydl_opts['merge_output_format'] = 'mp4'
                else:
                    ydl_opts['format'] = 'best[ext=mp4]/best'
            else:
                try:
                    height = int(quality)
                    if ffmpeg_exe:
                        ydl_opts['format'] = f"bestvideo[height<={height}]+bestaudio/best[height<={height}]/best"
                        ydl_opts['merge_output_format'] = 'mp4'
                    else:
                        ydl_opts['format'] = f"best[height<={height}][ext=mp4]/best[ext=mp4]/best"
                except Exception:
                    ydl_opts['format'] = 'bestvideo+bestaudio/best' if ffmpeg_exe else 'best[ext=mp4]/best'

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info_dict = ydl.extract_info(url, download=True)
                target_file = ydl.prepare_filename(info_dict) if info_dict else ""

            active_tasks.pop(download_id, None)

            # Resolve the final output file
            dest_file = ""
            # If target_file exists, use it
            if target_file and os.path.exists(target_file):
                dest_file = target_file
            # If target extension changed (e.g. mp3 or mp4 merged)
            elif target_file:
                for alt_ext in ['.mp4', '.mp3', '.m4a', '.webm', '.mkv']:
                    candidate = str(Path(target_file).with_suffix(alt_ext))
                    if os.path.exists(candidate):
                        dest_file = candidate
                        break

            # If still not found, check video ID in output directory
            if not dest_file or not os.path.exists(dest_file):
                video_yt_id = (info_dict.get('id') if info_dict else "") or ""
                if video_yt_id:
                    for f in os.listdir(output_dir):
                        if video_yt_id in f and not f.endswith('.part') and not f.endswith('.ytdl'):
                            dest_file = os.path.join(output_dir, f)
                            break

            if not dest_file or not os.path.exists(dest_file):
                dest_file = captured_file_path or final_filename or os.path.join(output_dir, "Downloaded Media.mp4")

            on_complete(download_id, dest_file)
        except Exception as e:
            active_tasks.pop(download_id, None)
            err_msg = str(e)
            if "cancelled by user" in err_msg.lower():
                print(f"[Downloader] Task {download_id} was cancelled.")
            else:
                if "live stream recording is not available" in err_msg.lower():
                    clean_err = "Cannot download an active live stream. Please choose a finished video."
                else:
                    clean_err = err_msg
                print(f"[Downloader] Error during download: {clean_err}")
                on_error(download_id, clean_err)

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()

def cancel_download(download_id: str) -> bool:
    event = active_tasks.get(download_id)
    if event:
        event.set()
        active_tasks.pop(download_id, None)
        return True
    return False
