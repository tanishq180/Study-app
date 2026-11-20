import json
import os
from pathlib import Path
from datetime import datetime

DEFAULT_CONTENT = """<h2>Session Focus: Key Principles & Core Ideas</h2><p>Welcome to your dual-pane study environment. Document your notes here while streaming lectures or tutorials.</p><blockquote><p>💡 <strong>Pro Tip:</strong> Click the <strong>Insert Timestamp</strong> button (or press <kbd>Ctrl+Shift+T</kbd>) to bookmark specific moments in the video. Clicking any timestamp pill inside the notes will immediately seek the video to that exact second!</p></blockquote><ul><li>Point 1: Active recall outperforms passive review.</li><li>Point 2: Spaced repetition locks concepts in long-term memory.</li><li>Point 3: Take timestamped notes during dense conceptual segments.</li></ul>"""

DEFAULT_STATE = {
    "video": {
        "url": "https://www.youtube.com/watch?v=jfKfPfyJRdk",
        "videoId": "jfKfPfyJRdk",
        "title": "lofi hip hop radio 📚 - beats to relax/study to",
        "currentTime": 0,
        "sourceType": "youtube",
        "localFilePath": "",
        "recentVideos": [
            {
                "videoId": "jfKfPfyJRdk",
                "url": "https://www.youtube.com/watch?v=jfKfPfyJRdk",
                "title": "lofi hip hop radio 📚 - beats to relax/study to",
                "timestamp": int(datetime.now().timestamp() * 1000)
            }
        ]
    },
    "notes": {
        "title": "Study Session Notes",
        "content": DEFAULT_CONTENT,
        "lastSaved": datetime.now().isoformat(),
        "activeNoteId": "note-1",
        "documents": [
            {
                "id": "note-1",
                "title": "Study Session Notes",
                "content": DEFAULT_CONTENT,
                "updatedAt": datetime.now().isoformat()
            }
        ]
    },
    "todos": [
        {
            "id": "todo-1",
            "text": "Watch Chapter 4 biology lecture & record notes",
            "completed": False,
            "priority": "high",
            "category": "Study",
            "dueDate": "Today",
            "createdAt": datetime.now().isoformat()
        },
        {
            "id": "todo-2",
            "text": "Download tutorial video for offline review",
            "completed": False,
            "priority": "medium",
            "category": "Downloader",
            "dueDate": "Tomorrow",
            "createdAt": datetime.now().isoformat()
        },
        {
            "id": "todo-3",
            "text": "Review flashcards and summary questions",
            "completed": True,
            "priority": "low",
            "category": "Review",
            "dueDate": "Done",
            "createdAt": datetime.now().isoformat()
        }
    ],
    "settings": {
        "downloadFolder": str(Path.home() / "Downloads"),
        "splitRatio": 52,
        "activeTab": "split"
    },
    "spotify": {
        "currentUri": "playlist/37i9dQZF1DWZeKCadgRdKQ",
        "embedUrl": "https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0",
        "title": "Deep Focus",
        "recentItems": [
            {
                "title": "Deep Focus",
                "uri": "playlist/37i9dQZF1DWZeKCadgRdKQ",
                "type": "playlist",
                "category": "Focus"
            },
            {
                "title": "Lofi Beats",
                "uri": "playlist/37i9dQZF1DXdLEN7aqioXM",
                "type": "playlist",
                "category": "Chill"
            },
            {
                "title": "Peaceful Piano",
                "uri": "playlist/37i9dQZF1DX4sWSpwq3LiO",
                "type": "playlist",
                "category": "Instrumental"
            }
        ]
    },
    "downloads": []
}

def get_state_file_path() -> Path:
    # Use APPDATA on Windows, or ~/.studyhub
    app_data = os.environ.get("APPDATA")
    if app_data:
        base_dir = Path(app_data) / "StudyHub"
    else:
        base_dir = Path.home() / ".studyhub"
    
    base_dir.mkdir(parents=True, exist_ok=True)
    return base_dir / "study-app-state.json"

def load_app_state() -> dict:
    file_path = get_state_file_path()
    if file_path.exists():
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            # Merge defaults
            merged = dict(DEFAULT_STATE)
            merged.update(data)
            merged["video"] = {**DEFAULT_STATE["video"], **data.get("video", {})}
            merged["notes"] = {**DEFAULT_STATE["notes"], **data.get("notes", {})}
            merged["settings"] = {**DEFAULT_STATE["settings"], **data.get("settings", {})}
            merged["spotify"] = {**DEFAULT_STATE["spotify"], **data.get("spotify", {})}
            merged["todos"] = data.get("todos", DEFAULT_STATE["todos"])
            # Do not persist or restore download history across sessions
            merged["downloads"] = []
            return merged
        except Exception as e:
            print(f"[Store] Error loading state from {file_path}: {e}")
    
    return dict(DEFAULT_STATE)

def save_app_state(state: dict) -> dict:
    file_path = get_state_file_path()
    temp_path = file_path.with_suffix(".json.tmp")
    try:
        # Exclude downloads from disk persistence so download history is not retained
        persisted_state = dict(state)
        persisted_state["downloads"] = []

        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(persisted_state, f, indent=2, ensure_ascii=False)
        
        # Atomic rename
        if temp_path.exists():
            temp_path.replace(file_path)
        return {"success": True}
    except Exception as e:
        print(f"[Store] Error saving state: {e}")
        return {"success": False, "error": str(e)}

