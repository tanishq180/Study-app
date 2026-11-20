import sys
import os
import traceback
from pathlib import Path

# Redirect stdout/stderr if running under pythonw
if sys.stdout is None:
    sys.stdout = open(os.devnull, 'w')
if sys.stderr is None:
    sys.stderr = open(os.devnull, 'w')

import webview

from backend.server import start_server
from backend.api import StudyHubApi

def main():
    try:
        if getattr(sys, 'frozen', False):
            base_dir = Path(getattr(sys, '_MEIPASS', Path(sys.executable).parent))
        else:
            base_dir = Path(__file__).resolve().parent
        dist_dir = base_dir / "dist"

        # Start local streaming server for assets & range-request video media
        port, server = start_server(dist_dir)
        print(f"[StudyHub Python] Local server started on http://127.0.0.1:{port}")

        # Initialize Python API
        api = StudyHubApi(server_port=port)

        # Window configuration
        window = webview.create_window(
            title="StudyHub Desktop",
            url=f"http://127.0.0.1:{port}",
            js_api=api,
            width=1360,
            height=880,
            min_size=(1024, 680),
            background_color="#090a0f"
        )

        api.set_window(window)

        # Start Edge WebView2 desktop app
        webview.start(debug=False)
    except Exception as e:
        with open("crash.log", "w", encoding="utf-8") as f:
            traceback.print_exc(file=f)

if __name__ == "__main__":
    main()
