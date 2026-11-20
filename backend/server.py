import os
import mimetypes
import re
import socket
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, unquote
import threading

def make_handler(dist_dir: Path):
    class StudyHubRequestHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(dist_dir), **kwargs)

        def do_GET(self):
            parsed = urlparse(self.path)

            # Handle local media streaming with Byte-Range requests
            if parsed.path == "/media":
                query = parse_qs(parsed.query)
                file_param = query.get("file", [None])[0]
                if not file_param:
                    self.send_error(400, "Missing 'file' parameter")
                    return

                file_path = unquote(file_param)
                if not os.path.exists(file_path) or not os.path.isfile(file_path):
                    self.send_error(404, "Media file not found")
                    return

                self.serve_media_with_range(file_path)
                return

            # Check if requested file exists in dist directory
            req_path = unquote(parsed.path).lstrip("/")
            full_path = (dist_dir / req_path).resolve()
            if not full_path.exists() or full_path.is_dir():
                # Serve index.html for SPA fallback
                index_path = dist_dir / "index.html"
                if index_path.exists():
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.send_header("Content-Length", str(index_path.stat().st_size))
                    self.end_headers()
                    with open(index_path, "rb") as f:
                        self.wfile.write(f.read())
                    return

            super().do_GET()

        def serve_media_with_range(self, file_path: str):
            file_size = os.path.getsize(file_path)
            mime_type, _ = mimetypes.guess_type(file_path)
            if not mime_type:
                mime_type = "video/mp4" if file_path.endswith(".mp4") else "application/octet-stream"

            range_header = self.headers.get("Range")

            if not range_header:
                self.send_response(200)
                self.send_header("Content-Type", mime_type)
                self.send_header("Content-Length", str(file_size))
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()

                with open(file_path, "rb") as f:
                    while chunk := f.read(64 * 1024):
                        self.wfile.write(chunk)
                return

            range_match = re.match(r"bytes=(\d+)-(\d*)", range_header)
            if not range_match:
                self.send_error(416, "Requested Range Not Satisfiable")
                return

            start = int(range_match.group(1))
            end = int(range_match.group(2)) if range_match.group(2) else file_size - 1

            if start >= file_size or end >= file_size or start > end:
                self.send_error(416, "Requested Range Not Satisfiable")
                return

            length = end - start + 1

            self.send_response(206)
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
            self.send_header("Content-Length", str(length))
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = length
                while remaining > 0:
                    chunk_size = min(64 * 1024, remaining)
                    data = f.read(chunk_size)
                    if not data:
                        break
                    self.wfile.write(data)
                    remaining -= len(data)

        def log_message(self, format, *args):
            pass

    return StudyHubRequestHandler

def find_free_port(start_port: int = 5174) -> int:
    port = start_port
    while port < 6000:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', port))
                return port
        except OSError:
            port += 1
    return start_port

def start_server(dist_path: Path) -> tuple[int, ThreadingHTTPServer]:
    port = find_free_port()
    handler_class = make_handler(dist_path)
    server = ThreadingHTTPServer(('127.0.0.1', port), handler_class)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return port, server
