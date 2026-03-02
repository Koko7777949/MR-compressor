import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { encryptData, decryptData } from '../lib/crypto';
import { FileArchive, Lock, Unlock, Download, Upload, Loader2, File as FileIcon, X, FolderOpen, ShieldCheck, HardDrive } from 'lucide-react';

export default function FileCompressor() {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'compress' | 'extract'>('compress');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setError('');
      setSuccessMsg('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setFiles(Array.from(e.dataTransfer.files));
      setError('');
      setSuccessMsg('');
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCompress = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError('');
    setSuccessMsg('');

    try {
      const zip = new JSZip();
      files.forEach(file => {
        zip.file(file.name, file);
      });

      const zipContent = await zip.generateAsync({ 
        type: 'uint8array',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });

      let finalData = zipContent;
      let extension = '.zip';

      if (password) {
        finalData = await encryptData(zipContent, password);
        extension = '.enc';
      }

      const blob = new Blob([finalData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archive-${Date.now()}${extension}`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMsg('Files compressed successfully!');
    } catch (err) {
      setError('An error occurred during compression or encryption.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtract = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError('');
    setSuccessMsg('');

    try {
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      let data = new Uint8Array(arrayBuffer);

      if (file.name.endsWith('.enc')) {
        if (!password) {
          throw new Error('Password is required to decrypt this file.');
        }
        try {
          data = await decryptData(data, password);
        } catch (e) {
          throw new Error('Incorrect password or corrupted file.');
        }
      }

      const zip = await JSZip.loadAsync(data);
      
      const promises: Promise<void>[] = [];
      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          promises.push(
            zipEntry.async('blob').then(blob => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = relativePath.split('/').pop() || 'file';
              a.click();
              URL.revokeObjectURL(url);
            })
          );
        }
      });

      await Promise.all(promises);
      setSuccessMsg('Files extracted successfully!');
    } catch (err: any) {
      setError(err.message || 'An error occurred during extraction.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Sidebar / Controls */}
      <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-indigo-600" />
          Operation Mode
        </h2>
        
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            onClick={() => { setMode('compress'); setFiles([]); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${mode === 'compress' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FileArchive className="w-4 h-4" />
            Compress
          </button>
          <button
            onClick={() => { setMode('extract'); setFiles([]); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${mode === 'extract' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FolderOpen className="w-4 h-4" />
            Extract
          </button>
        </div>

        <div className="space-y-4 flex-1">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Security (AES-GCM)
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'compress' ? "Optional password..." : "Required for .enc files..."}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
            />
            {mode === 'compress' && (
              <p className="text-xs text-slate-500 leading-relaxed">
                Adding a password will encrypt your archive into a secure <span className="font-mono bg-slate-100 px-1 rounded">.enc</span> file.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">{error}</div>}
          {successMsg && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm font-medium">{successMsg}</div>}

          <button
            onClick={mode === 'compress' ? handleCompress : handleExtract}
            disabled={files.length === 0 || isProcessing}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : mode === 'compress' ? (
              <>
                <FileArchive className="w-5 h-5" />
                {password ? 'Encrypt & Compress' : 'Compress Files'}
              </>
            ) : (
              <>
                <Unlock className="w-5 h-5" />
                Extract Archive
              </>
            )}
          </button>
        </div>
      </div>

      {/* Browser / Dropzone */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">File Browser</h2>
          <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2.5 py-1 rounded-full">
            {files.length} {files.length === 1 ? 'file' : 'files'} selected
          </span>
        </div>
        
        <div className="flex-1 p-6 flex flex-col">
          <div 
            className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden ${
              isDragging 
                ? 'border-indigo-500 bg-indigo-50' 
                : files.length > 0 
                  ? 'border-slate-200 bg-slate-50/50' 
                  : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-slate-100'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => files.length === 0 && fileInputRef.current?.click()}
          >
            {files.length === 0 ? (
              <div className="text-center p-8 pointer-events-none">
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-indigo-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">Drop files here</h3>
                <p className="text-slate-500 text-sm mb-4">or click to browse from your computer</p>
                <div className="inline-flex items-center justify-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 shadow-sm">
                  Browse Files
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 p-4 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileIcon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-semibold text-slate-700 truncate">{file.name}</span>
                          <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(i); }} 
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-center">
                  <button 
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Add more files
                  </button>
                </div>
              </div>
            )}
            <input 
              type="file" 
              multiple={mode === 'compress'} 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={mode === 'extract' ? '.zip,.enc' : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
