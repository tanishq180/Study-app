# StudyHub Desktop - Python Edition

A desktop study cockpit combining YouTube video study, ambient Spotify music, offline video playback, rich-text note-taking with two-way clickable timestamp linking, persistent task management, and multi-threaded video downloading.

Built using a modern hybrid stack:
- **Backend:** Python 3.14, Microsoft Edge WebView2 (`pywebview`), `yt-dlp`, `imageio-ffmpeg`
- **Frontend:** React 18, TypeScript 5, Vite 8, Tailwind CSS, Lucide React Icons
- **Local Streaming:** Python `ThreadingHTTPServer` supporting HTTP 206 Partial Content Byte-Range requests
- **State Engine:** Debounced atomic JSON serialization (`study-app-state.json`)

---

## 🚀 Key Features

### 1. Dual-Pane Study Dashboard (Split View)
- **3-Way Media Switcher:** Toggle smoothly between **YouTube**, **Spotify Music**, and **Offline Video**.
- **YouTube Streaming:** Stream any lecture, tutorial, or video. Features **5-second skip buttons (`-5s` / `+5s`)**, speed switcher (`0.75x`, `1x`, `1.25x`, `1.5x`, `2x`), and recent history.
- **Embedded Spotify Player:** Study with ambient focus music directly inside the media pane alongside your notes. Select from curated presets (*Deep Focus, Lofi Beats, Peaceful Piano, Intense Studying, Brain Food*) or paste any custom Spotify playlist.
- **Offline Video Player:** Play downloaded videos via the local HTTP 206 range server with zero-latency seeking, speed controls, and timestamp bookmarking.
- **Adjustable Splitter:** Drag the center divider to resize the video and note panes anywhere between 25% and 75% width. Ratio is preserved across sessions.
- **Interactive Timestamps:** Click **Insert Timestamp** (`Ctrl+Shift+T`) to capture the video's current time (e.g. `⏱️ 04:12`). Clicking any timestamp pill inside the notes immediately seeks the video to that moment!

### 2. Multi-Page Rich Notes Editor
- **WYSIWYG Toolbar:** Bold, italic, underline, strikethrough, headings (H1, H2, H3), lists, quotes, code blocks, and text highlights.
- **Notebook Tabs:** Create multiple note pages, switch between lecture notes, rename, and delete notes.
- **Document Exporting:** Export notes to **Markdown (`.md`)**, **Plain Text (`.txt`)**, or **Print/PDF**.
- **Pin Spotify to Notes:** One-click button to embed a clickable link to your active Spotify soundtrack directly in your notes.
- **Live Stats:** Real-time word count and character count.

### 3. Dedicated YouTube Downloader Hub
- **Native Python `yt-dlp` Engine:** Downloads run on independent background daemon threads without blocking the UI.
- **Format & Resolution Selector:**
  - **Video (MP4):** 1080p Full HD, 720p HD, 480p SD, 360p Low.
  - **Audio Only:** MP3 High Quality (320kbps).
- **Metadata Preview:** Thumbnail, duration, channel name, and available formats.
- **Live Telemetry:** Real-time progress bar, transfer speed (MB/s), ETA countdown, and file size.
- **One-Click Study:** "Play in Split View" opens completed downloads directly into the split-view player.

### 4. Dedicated Spotify Music Hub
- Full-screen dashboard featuring 8 curated focus presets, search/paste URL bar, recent history drawer, and a one-click "Study with this in Split View" transition.

### 5. Persistent Task & To-Do Manager
- Full-screen task management dashboard with priority tags (High, Medium, Low), due dates, category filtering, keyword search, and bulk clean-up.

### 6. State Persistence (Auto-Resume)
- Notes, active video/Spotify state, split ratio, tasks, and settings are saved automatically to `study-app-state.json`.

---

## 📁 Project Structure

```
Study App/
├── main.py                     # Desktop entry point (PyWebView + HTTP server)
├── backend/
│   ├── __init__.py
│   ├── api.py                  # Python API exposed to JS (StudyHubApi)
│   ├── downloader.py           # yt-dlp threaded download pipeline
│   ├── server.py               # HTTP 206 Range server for SPA & media streaming
│   └── store.py                # JSON state persistence & auto-resume engine
├── src/
│   ├── components/             # React components (Viewer, Notes, Downloader, Spotify, Todos)
│   ├── context/                # AppContext state management
│   ├── utils/                  # Python bridge, YouTube & Spotify utilities
│   └── types/                  # TypeScript data contracts
├── dist/                       # Production frontend build
├── StudyHub.bat                # Windows batch launcher
├── StudyHub.lnk                # Windows desktop shortcut
├── DOCUMENTATION.md            # Comprehensive Architecture & Operational Guide
└── README.md                   # Project overview
```

---

## 🛠️ Running the Application

### 1. Launch via Desktop Shortcut
Double-click **`StudyHub.lnk`** on your desktop or **`StudyHub.bat`** in the project folder.

### 2. Launch via Terminal
```powershell
python main.py
```

### 3. Rebuild Frontend
```powershell
npm run build
```

---

📖 For the complete technical breakdown, sequence diagrams, and architecture, see [DOCUMENTATION.md](file:///d:/Study%20App/DOCUMENTATION.md).
