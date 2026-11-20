import React, { useState, useRef, useEffect, useCallback } from 'react';
import { YouTubeViewer } from './YouTubeViewer';
import { NotesEditor } from './NotesEditor';
import { useApp } from '../context/AppContext';
import { GripVertical } from 'lucide-react';

export const SplitView: React.FC = () => {
  const { state, setSplitRatio } = useApp();
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const ratio = state.settings.splitRatio || 52;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const totalWidth = rect.width;
      const newRatio = (currentX / totalWidth) * 100;
      setSplitRatio(Math.round(newRatio));
    },
    [isDragging, setSplitRatio]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex overflow-hidden relative select-none ${
        isDragging ? 'cursor-col-resize select-none pointer-events-auto' : ''
      }`}
    >
      {/* Left Pane: YouTube Viewer */}
      <div
        style={{ width: `${ratio}%` }}
        className="h-full flex flex-col min-w-[320px] max-w-[80%]"
      >
        <YouTubeViewer />
      </div>

      {/* Resizable Divider Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`w-2 h-full bg-gray-900 hover:bg-indigo-600/60 transition-colors cursor-col-resize flex items-center justify-center relative group z-10 ${
          isDragging ? 'bg-indigo-600' : ''
        }`}
        title="Drag to resize panels"
      >
        <div className="w-1 h-6 rounded-full bg-gray-700 group-hover:bg-white flex items-center justify-center pointer-events-none">
          <GripVertical className="w-2.5 h-2.5 text-gray-400 group-hover:text-white" />
        </div>
      </div>

      {/* Right Pane: Notes Editor */}
      <div
        style={{ width: `${100 - ratio}%` }}
        className="h-full flex flex-col min-w-[320px] max-w-[80%]"
      >
        <NotesEditor />
      </div>
    </div>
  );
};

