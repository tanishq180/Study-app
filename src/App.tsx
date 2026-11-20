import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { SplitView } from './components/SplitView';
import { TodoList } from './components/TodoList';
import { Downloader } from './components/Downloader';
import { SpotifySection } from './components/SpotifySection';

const MainContent: React.FC = () => {
  const { state } = useApp();

  return (
    <main className="flex-1 flex overflow-hidden relative">
      {state.settings.activeTab === 'split' && <SplitView />}
      {state.settings.activeTab === 'downloader' && <Downloader />}
      {state.settings.activeTab === 'spotify' && <SpotifySection />}
      {state.settings.activeTab === 'todos' && <TodoList />}
    </main>
  );
};

export default function App() {
  return (
    <AppProvider>
      <div className="w-screen h-screen flex flex-col bg-[#090a0f] text-gray-100 overflow-hidden font-sans">
        <Header />
        <MainContent />
      </div>
    </AppProvider>
  );
}
