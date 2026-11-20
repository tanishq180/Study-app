import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Filter,
  Calendar,
  AlertTriangle,
  Tag,
  ListTodo
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { TodoItem, Priority } from '../types/app';

export const TodoList: React.FC = () => {
  const {
    state,
    addTodo,
    toggleTodo,
    editTodo,
    deleteTodo,
    clearCompletedTodos
  } = useApp();

  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newCategory, setNewCategory] = useState('Study');
  const [newDueDate, setNewDueDate] = useState('');

  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    addTodo(newText.trim(), newPriority, newCategory, newDueDate || 'Today');
    setNewText('');
  };

  const startEdit = (todo: TodoItem) => {
    setEditingId(todo.id);
    setEditText(todo.text);
    setEditPriority(todo.priority);
  };

  const saveEdit = (id: string) => {
    if (!editText.trim()) return;
    editTodo(id, { text: editText.trim(), priority: editPriority });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const categories = Array.from(new Set(state.todos.map((t) => t.category).filter(Boolean)));

  const filteredTodos = state.todos.filter((todo) => {
    if (filter === 'active' && todo.completed) return false;
    if (filter === 'completed' && !todo.completed) return false;
    if (categoryFilter !== 'all' && todo.category !== categoryFilter) return false;
    return true;
  });

  const total = state.todos.length;
  const completedCount = state.todos.filter((t) => t.completed).length;
  const progressPercent = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            High
          </span>
        );
      case 'medium':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            Low
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-950 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
      {/* Header Banner */}
      <div className="mb-6 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-gray-900 border border-indigo-900/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-indigo-400" />
              Study & Task Manager
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Persistent to-do list auto-synced across sessions. Stay organized with your lectures and assignments.
            </p>
          </div>

          {/* Progress Card */}
          <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-3 min-w-[200px]">
            <div className="flex justify-between text-xs font-medium mb-1.5">
              <span className="text-gray-400">Progress</span>
              <span className="text-indigo-300 font-mono">
                {completedCount} / {total} ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add New Task Form */}
      <form
        onSubmit={handleAdd}
        className="mb-6 bg-gray-900/80 border border-gray-800 rounded-xl p-4 shadow-md flex flex-col gap-3"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Add a new task (e.g. Finish lecture notes, review quiz flashcards...)"
            className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3.5 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
          <button
            type="submit"
            disabled={!newText.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>

        {/* Priority & Meta Selector */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 pt-1">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[11px]">Priority:</span>
            <div className="flex items-center gap-1 bg-gray-950 p-0.5 rounded border border-gray-800">
              {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setNewPriority(p)}
                  className={`capitalize px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    newPriority === p
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[11px]">Category:</span>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g. Study, Downloader"
              className="bg-gray-950 border border-gray-800 rounded px-2 py-0.5 text-xs text-gray-200 w-28 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[11px]">Due:</span>
            <input
              type="text"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              placeholder="Today / Tomorrow"
              className="bg-gray-950 border border-gray-800 rounded px-2 py-0.5 text-xs text-gray-200 w-28 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </form>

      {/* Filter and Category Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* State filters */}
        <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            All ({total})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              filter === 'active'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Active ({total - completedCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              filter === 'completed'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Category Pills & Clear Completed */}
        <div className="flex items-center gap-2">
          {categories.length > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-gray-500" />
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  categoryFilter === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                All Tags
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    categoryFilter === cat
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {completedCount > 0 && (
            <button
              onClick={clearCompletedTodos}
              className="text-xs text-gray-400 hover:text-rose-400 transition flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-900"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Completed
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="flex flex-col gap-2">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-800 rounded-xl bg-gray-900/30">
            <ListTodo className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400 font-medium">No tasks found</p>
            <p className="text-xs text-gray-600 mt-0.5">
              {filter !== 'all' ? 'Try switching the filter tab' : 'Add your first task above to get started'}
            </p>
          </div>
        ) : (
          filteredTodos.map((todo) => {
            const isEditing = editingId === todo.id;

            return (
              <div
                key={todo.id}
                className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  todo.completed
                    ? 'bg-gray-900/30 border-gray-850 opacity-70'
                    : 'bg-gray-900/70 border-gray-800 hover:border-gray-700'
                }`}
              >
                {/* Left: Checkbox & Text */}
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      todo.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-gray-700 hover:border-indigo-500 bg-gray-950'
                    }`}
                  >
                    {todo.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 bg-gray-950 border border-gray-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as Priority)}
                        className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <button
                        onClick={() => saveEdit(todo.id)}
                        className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1 rounded bg-gray-800 text-gray-400 hover:text-white transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`text-xs transition font-medium ${
                          todo.completed
                            ? 'line-through text-gray-500'
                            : 'text-gray-200'
                        }`}
                      >
                        {todo.text}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        {getPriorityBadge(todo.priority)}
                        {todo.category && (
                          <span className="text-[10px] text-gray-400 bg-gray-800/80 px-2 py-0.2 rounded border border-gray-750">
                            {todo.category}
                          </span>
                        )}
                        {todo.dueDate && (
                          <span className="text-[10px] text-gray-500 flex items-center gap-1 font-mono">
                            <Calendar className="w-2.5 h-2.5" />
                            {todo.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Actions */}
                {!isEditing && (
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    <button
                      onClick={() => startEdit(todo)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
                      title="Edit Task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
