import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Image as ImageIcon, Wand2, Upload, Loader2, Download, Sparkles } from 'lucide-react';

export default function ImageEditor() {
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResultImage(null);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!image || !prompt) return;
    setIsProcessing(true);
    setError('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const base64Data = image.split(',')[1];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const resultBase64 = part.inlineData.data;
          setResultImage(`data:image/png;base64,${resultBase64}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        throw new Error('No image was returned from the model.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while editing the image.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          AI Studio Editor
        </h2>
        <span className="text-xs font-medium text-indigo-200 bg-indigo-900/50 px-2.5 py-1 rounded-full border border-indigo-700/50">
          Powered by Gemini 2.5 Flash
        </span>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Upload & Input */}
        <div className="space-y-6 flex flex-col">
          <div 
            className="flex-1 border-2 border-dashed border-slate-300 rounded-2xl p-2 text-center hover:border-indigo-400 transition-colors cursor-pointer bg-slate-50 relative overflow-hidden group min-h-[250px] flex items-center justify-center"
            onClick={() => fileInputRef.current?.click()}
          >
            {image ? (
              <img src={image} alt="Original" className="w-full h-full object-contain rounded-xl" />
            ) : (
              <div className="py-8">
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-indigo-500" />
                </div>
                <p className="text-slate-700 font-bold text-lg mb-1">Upload an image</p>
                <p className="text-slate-500 text-sm">Click to browse or drag and drop</p>
              </div>
            )}
            <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
              <p className="text-white font-bold tracking-wide flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Change Image
              </p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
            />
          </div>

          <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-indigo-600" />
              What should the AI do?
            </label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Add a retro filter, remove the person in the background, make it look like a painting..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none h-28 text-sm shadow-inner"
            />
            
            {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">{error}</div>}

            <button
              onClick={handleEdit}
              disabled={!image || !prompt || isProcessing}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Magic...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Apply AI Edit
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Result */}
        <div className="bg-slate-100 rounded-2xl border border-slate-200 p-2 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
          {isProcessing ? (
            <div className="text-center text-slate-500 z-10">
              <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
              </div>
              <p className="font-bold text-lg text-slate-700">Processing Image...</p>
              <p className="text-sm mt-2 text-slate-500">The AI is working its magic</p>
            </div>
          ) : resultImage ? (
            <div className="w-full h-full flex flex-col">
              <div className="flex-1 relative rounded-xl overflow-hidden bg-white">
                <img src={resultImage} alt="Result" className="absolute inset-0 w-full h-full object-contain" />
              </div>
              <div className="mt-4 px-2 pb-2">
                <a 
                  href={resultImage} 
                  download={`mr-compressor-ai-${Date.now()}.png`}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <Download className="w-5 h-5" />
                  Download Result
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 z-10">
              <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <ImageIcon className="w-10 h-10 text-slate-400" />
              </div>
              <p className="font-medium text-slate-500">Your edited image will appear here</p>
            </div>
          )}
          
          {/* Background decorative elements */}
          {!resultImage && !isProcessing && (
            <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
              <Sparkles className="w-64 h-64" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
