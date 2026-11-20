import os
import sys
import json
import subprocess
import urllib.parse
from pathlib import Path
from typing import Optional
import webview

from . import store
from . import downloader

class StudyHubApi:
    def __init__(self, server_port: int):
        self._server_port = server_port
        self._window = None

    def set_window(self, window):
        self._window = window

    # State Persistence
    def load_state(self):
        return store.load_app_state()

    def save_state(self, state):
        return store.save_app_state(state)

    # Downloader
    def get_video_info(self, url: str):
        return downloader.get_video_info(url)

    def start_download(self, options: dict):
        def on_progress(data: dict):
            if self._window:
                js_code = f"window.__onPythonDownloadProgress && window.__onPythonDownloadProgress({json.dumps(data)});"
                self._window.evaluate_js(js_code)

        def on_complete(download_id: str, file_path: str):
            if self._window:
                payload = {"id": download_id, "filePath": file_path}
                js_code = f"window.__onPythonDownloadComplete && window.__onPythonDownloadComplete({json.dumps(payload)});"
                self._window.evaluate_js(js_code)

        def on_error(download_id: str, error_msg: str):
            if self._window:
                payload = {"id": download_id, "error": error_msg}
                js_code = f"window.__onPythonDownloadError && window.__onPythonDownloadError({json.dumps(payload)});"
                self._window.evaluate_js(js_code)

        downloader.start_download(options, on_progress, on_complete, on_error)
        return {"success": True}

    def cancel_download(self, download_id: str):
        success = downloader.cancel_download(download_id)
        return {"success": success}

    def check_downloader_ready(self):
        return {"ready": True}

    def get_default_download_path(self):
        return str(Path.home() / "Downloads")

    # Native File & Folder Dialogs
    def select_download_folder(self):
        if not self._window:
            return None
        result = self._window.create_file_dialog(webview.FOLDER_DIALOG)
        if result and len(result) > 0:
            return result[0]
        return None

    def select_local_video(self):
        if not self._window:
            return None
        file_types = (
            'Media Files (*.mp4;*.mkv;*.webm;*.mov;*.avi;*.mp3;*.m4a;*.wav)',
            'All Files (*.*)'
        )
        result = self._window.create_file_dialog(webview.OPEN_DIALOG, file_types=file_types)
        if result and len(result) > 0:
            return result[0]
        return None

    def show_in_folder(self, file_path: str):
        try:
            if not os.path.exists(file_path):
                return {"success": False, "error": "File does not exist"}

            if sys.platform == 'win32':
                norm_path = os.path.normpath(file_path)
                subprocess.Popen(f'explorer /select,"{norm_path}"')
            elif sys.platform == 'darwin':
                subprocess.Popen(['open', '-R', file_path])
            else:
                subprocess.Popen(['xdg-open', os.path.dirname(file_path)])
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def open_file(self, file_path: str):
        try:
            if not os.path.exists(file_path):
                return {"success": False, "error": "File does not exist"}

            if sys.platform == 'win32':
                os.startfile(file_path)
            elif sys.platform == 'darwin':
                subprocess.Popen(['open', file_path])
            else:
                subprocess.Popen(['xdg-open', file_path])
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_local_media_url(self, file_path: str):
        if not file_path or not os.path.exists(file_path):
            return None
        quoted = urllib.parse.quote(file_path)
        return f"http://127.0.0.1:{self._server_port}/media?file={quoted}"

    def export_notes(self, options: dict):
        try:
            title = options.get('title', 'Study-Notes')
            content = options.get('content', '')
            file_format = options.get('format', 'markdown')

            ext_map = {
                'markdown': ('Markdown Files (*.md)', 'md'),
                'html': ('HTML Files (*.html)', 'html'),
                'txt': ('Text Files (*.txt)', 'txt')
            }

            filter_name, ext = ext_map.get(file_format, ('Text Files (*.txt)', 'txt'))
            default_filename = f"{title}.{ext}"

            if not self._window:
                return {"success": False, "error": "Window not available"}

            target_path = self._window.create_file_dialog(
                webview.SAVE_DIALOG,
                save_filename=default_filename,
                file_types=(filter_name, 'All Files (*.*)')
            )

            if target_path:
                path_str = target_path if isinstance(target_path, str) else target_path[0]
                with open(path_str, 'w', encoding='utf-8') as f:
                    f.write(content)
                return {"success": True, "filePath": path_str}

            return {"success": False, "canceled": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # Window Controls
    def minimize_window(self):
        if self._window:
            self._window.minimize()

    def maximize_window(self):
        if self._window:
            self._window.maximize()

    def close_window(self):
        if self._window:
            self._window.destroy()
