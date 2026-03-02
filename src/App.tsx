import React, { useState, useEffect } from 'react';
import FileCompressor from './components/FileCompressor';
import ImageEditor from './components/ImageEditor';
import { FolderKanban, Sparkles, Box, Download } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'browser' | 'ai'>('browser');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center shadow-inner">
                <Box className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black tracking-wider">MR COMPRESSOR</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('browser')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'browser'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FolderKanban className="w-4 h-4" />
                <span className="hidden sm:inline">File Browser</span>
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'ai'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">AI Studio</span>
              </button>

              {/* Install App Button (Only visible when PWA install is available) */}
              {deferredPrompt && (
                <div className="pl-2 ml-2 border-l border-slate-700">
                  <button
                    onClick={handleInstallClick}
                    className="px-4 py-2 rounded-md text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Install App</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="h-full transition-all duration-300">
          {activeTab === 'browser' ? <FileCompressor /> : <ImageEditor />}
        </div>
      </main>
    </div>
  );
}
