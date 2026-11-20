import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Download,
  Clock,
  Sparkles,
  RotateCcw,
  CheckCircle,
  FileText,
  Plus,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatTime, parseTimeToSeconds } from '../utils/youtube';

export const NotesEditor: React.FC = () => {
  const {
    state,
    updateNotes,
    createNewNote,
    switchNote,
    deleteNote,
    seekTo
  } = useApp();

  const editorRef = useRef<HTMLDivElement | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Sync initial content once mounted or when switching notes
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== state.notes.content) {
      editorRef.current.innerHTML = state.notes.content || '<p></p>';
      calculateStats();
    }
  }, [state.notes.content, state.notes.activeNoteId]);

  const calculateStats = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    setCharCount(text.length);
    const words = text.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
  }, []);

  const handleInput = () => {
    if (!editorRef.current) return;
    const newContent = editorRef.current.innerHTML;
    updateNotes(newContent);
    calculateStats();
  };

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  // Timestamp click delegator: clicking any timestamp inside the note jumps to that video second!
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const timestampTag = target.closest('.timestamp-tag');
    if (timestampTag) {
      const timeSecAttr = timestampTag.getAttribute('data-time');
      if (timeSecAttr) {
        seekTo(parseInt(timeSecAttr, 10));
      } else {
        const text = timestampTag.textContent || '';
        const clean = text.replace(/[^\d:]/g, '');
        const sec = parseTimeToSeconds(clean);
        seekTo(sec);
      }
    }
  };

  const insertCurrentTimestamp = () => {
    const sec = Math.floor(state.video.currentTime || 0);
    const timeFormatted = formatTime(sec);
    const html = `<span class="timestamp-tag" data-time="${sec}" style="background: rgba(99, 102, 241, 0.2); color: #818cf8; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-weight: bold; cursor: pointer; border: 1px solid rgba(99, 102, 241, 0.4); display: inline-flex; align-items: center; gap: 4px;">⏱️ ${timeFormatted}</span>&nbsp;`;
    executeCommand('insertHTML', html);
  };

  const handleExport = async (format: 'markdown' | 'txt' | 'html') => {
    let contentToExport = '';
    const title = state.notes.title || 'Study-Notes';

    if (format === 'html') {
      contentToExport = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#222;}h1,h2,h3{color:#111;}.timestamp-tag{background:#e0e7ff;color:#4338ca;padding:2px 6px;border-radius:4px;font-family:monospace;}</style></head><body><h1>${title}</h1>${state.notes.content}</body></html>`;
    } else if (format === 'markdown') {
      contentToExport = `# ${title}\n\n` +
        state.notes.content
          .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
          .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
          .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
          .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<b>(.*?)<\/b>/gi, '**$1**')
          .replace(/<em>(.*?)<\/em>/gi, '*$1*')
          .replace(/<i>(.*?)<\/i>/gi, '*$1*')
          .replace(/<blockquote>(.*?)<\/blockquote>/gi, '> $1\n\n')
          .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
          .replace(/<span class="timestamp-tag"[^>]*data-time="(\d+)"[^>]*>(.*?)<\/span>/gi, '[$2](#t=$1)')
          .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/\n{3,}/g, '\n\n');
    } else {
      contentToExport = `${title}\n\n${editorRef.current?.innerText || ''}`;
    }

    if (window.api && typeof window.api.exportNotes === 'function') {
      const res = await window.api.exportNotes({ title, content: contentToExport, format });
      if (res.success) {
        setExportNotice(`Exported successfully!`);
        setTimeout(() => setExportNotice(null), 3000);
      }
    } else {
      const blob = new Blob([contentToExport], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.${format === 'markdown' ? 'md' : format}`;
      a.click();
      URL.revokeObjectURL(url);
      setExportNotice(`Saved ${title}.${format === 'markdown' ? 'md' : format}`);
      setTimeout(() => setExportNotice(null), 3000);
    }
  };

  const docs = state.notes.documents || [
    { id: 'default', title: state.notes.title, content: state.notes.content, updatedAt: '' }
  ];
  const activeId = state.notes.activeNoteId || docs[0]?.id;

  return (
    <div className="h-full flex flex-col bg-gray-950 overflow-hidden select-text">
      {/* Notebook Document Tabs Bar */}
      <div className="px-3 pt-2 bg-gray-925 border-b border-gray-800/80 flex items-center gap-1.5 overflow-x-auto select-none">
        {docs.map((doc) => {
          const isActive = doc.id === activeId;
          return (
            <div
              key={doc.id}
              onClick={() => switchNote(doc.id)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium cursor-pointer transition border-t border-x ${
                isActive
                  ? 'bg-gray-950 text-indigo-300 border-indigo-500/40 shadow-sm'
                  : 'bg-gray-900/40 text-gray-400 hover:text-gray-200 hover:bg-gray-900/80 border-transparent'
              }`}
            >
              <FileText className={`w-3 h-3 ${isActive ? 'text-indigo-400' : 'text-gray-500'}`} />
              <span className="truncate max-w-[130px]">{doc.title || 'Untitled Note'}</span>
              {docs.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote(doc.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition"
                  title="Close Note"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => createNewNote(`Lecture Notes ${docs.length + 1}`)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-400 hover:text-indigo-300 hover:bg-gray-900/60 rounded-md transition"
          title="Create New Note Document"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium">New Page</span>
        </button>
      </div>

      {/* Title Bar & Quick Actions */}
      <div className="p-3 border-b border-gray-800/80 bg-gray-900/60 flex items-center justify-between gap-2">
        <div className="flex-1 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <input
            type="text"
            value={state.notes.title}
            onChange={(e) => updateNotes(state.notes.content, e.target.value)}
            placeholder="Document Title (e.g. Biology Session Notes)"
            className="flex-1 bg-transparent text-sm font-semibold text-gray-100 placeholder-gray-500 focus:outline-none border-b border-transparent focus:border-indigo-500 transition px-1 py-0.5"
          />
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-1.5">
          <div className="relative group">
            <button className="px-2.5 py-1.2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium flex items-center gap-1 transition">
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-gray-900 border border-gray-800 rounded-lg shadow-xl p-1 z-30 min-w-[130px]">
              <button
                onClick={() => handleExport('markdown')}
                className="text-left px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-gray-800 rounded transition"
              >
                Markdown (.md)
              </button>
              <button
                onClick={() => handleExport('html')}
                className="text-left px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-gray-800 rounded transition"
              >
                HTML Document
              </button>
              <button
                onClick={() => handleExport('txt')}
                className="text-left px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-gray-800 rounded transition"
              >
                Plain Text (.txt)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="p-2 border-b border-gray-800/60 bg-gray-900/40 flex flex-wrap items-center gap-1 text-gray-300 select-none">
        <button
          onClick={() => executeCommand('bold')}
          className="p-1.5 rounded hover:bg-gray-800 hover:text-white transition"
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => executeCommand('italic')}
          className="p-1.5 rounded hover:bg-gray-800 hover:text-white transition"
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => executeCommand('underline')}
          className="p-1.5 rounded hover:bg-gray-800 hover:text-white transition"
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-gray-800 mx-1" />

        <button
          onClick={() => executeCommand('formatBlock', 'h1')}
          className="p-1.5 rounded hover:bg-gray-800 hover:text-white transition"
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => executeCommand('formatBlock', 'h2')}
          className="p-1.5 rounded hover:bg-gray-800 hover:text-white transition"
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-gray-800 mx-1" />

        <button
          onClick={() => executeCommand('insertUnorderedList')}
          className="p-1.5 rounded hover:bg-gray-800 hover:text-white transition"
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => executeCommand('insertOrderedList')}
          className="p-1.5 rounded hover:bg-gray-800 hover:text-white transition"
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => executeCommand('formatBlock', 'blockquote')}
          className="p-1.5 rounded hover:bg-gray-800 hover:text-white transition"
          title="Blockquote"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => executeCommand('formatBlock', 'pre')}
          className="p-1.5 rounded hover:bg-gray-800 hover:text-white transition"
          title="Code Block"
        >
          <Code className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-gray-800 mx-1" />

        {/* Quick Timestamp Insertion in Editor */}
        <button
          onClick={insertCurrentTimestamp}
          className="px-2 py-1 rounded bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 text-xs font-medium flex items-center gap-1 transition"
          title="Insert timestamp tag linking to current video time (Ctrl+Shift+T)"
        >
          <Clock className="w-3 h-3 text-indigo-400" />
          <span>+ Timestamp</span>
        </button>

        <button
          onClick={() => executeCommand('removeFormat')}
          className="p-1.5 rounded hover:bg-gray-800 hover:text-white transition ml-auto"
          title="Clear Formatting"
        >
          <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      {/* Editor Body */}
      <div className="flex-1 p-5 overflow-y-auto bg-gray-950">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onClick={handleEditorClick}
          className="min-h-full outline-none prose prose-invert max-w-none text-gray-200 text-sm leading-relaxed focus:ring-0 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-100 [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_blockquote]:border-l-2 [&_blockquote]:border-indigo-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-400 [&_pre]:bg-gray-900 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:font-mono [&_pre]:text-xs"
        />
      </div>

      {/* Footer / Status Bar */}
      <div className="h-7 border-t border-gray-800/80 bg-gray-900/60 px-4 flex items-center justify-between text-[11px] text-gray-500 select-none">
        <div className="flex items-center gap-4">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
          {exportNotice && (
            <span className="text-emerald-400 flex items-center gap-1 animate-pulse">
              <CheckCircle className="w-3 h-3" />
              {exportNotice}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Click any timestamp to seek &bull; Shortcuts: Ctrl+1/2/3, Ctrl+Shift+T</span>
        </div>
      </div>
    </div>
  );
};
