import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, BrainCircuit, Sparkles, Video, FileText, File as FileIcon } from 'lucide-react';
import { Attachment, ChatConfig, ModelType } from '../types';
import { MAX_THINKING_BUDGET_FLASH, MAX_THINKING_BUDGET_PRO, MODEL_LABELS } from '../constants';
import { fileToBase64 } from '../services/geminiService';

interface ChatInputProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  isLoading: boolean;
  config: ChatConfig;
  onConfigChange: (config: ChatConfig) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading, config, onConfigChange }) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    onSend(input, attachments);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const processFiles = async (files: FileList | File[]) => {
    const newAttachments: Attachment[] = [];
    const fileArray = files instanceof FileList ? Array.from(files) : files;

    for (const file of fileArray) {
        // Simple check for supported types by Gemini (Images, Video, Audio, PDF, Text)
        // We exclude generic binaries to avoid errors, but allow common text code files
        const isSupported = 
            file.type.startsWith('image/') || 
            file.type.startsWith('video/') || 
            file.type.startsWith('audio/') || 
            file.type === 'application/pdf' ||
            file.type.startsWith('text/') ||
            file.name.endsWith('.js') || file.name.endsWith('.ts') || 
            file.name.endsWith('.py') || file.name.endsWith('.json');

        if (isSupported) {
            try {
                const base64 = await fileToBase64(file);
                newAttachments.push({
                    mimeType: file.type || 'text/plain', // Fallback for code files usually
                    data: base64,
                    fileName: file.name
                });
            } catch (err) {
                console.error("Failed to process file", err);
            }
        } else {
            alert(`File type ${file.type} for ${file.name} might not be supported.`);
        }
    }
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files);
    }
    // Reset input
    if (e.target) e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const toggleModel = () => {
     const newModel = config.model === ModelType.FLASH ? ModelType.PRO : ModelType.FLASH;
     onConfigChange({
         ...config,
         model: newModel,
     });
  };
  
  const toggleThinking = () => {
      const isEnabled = !config.enableThinking;
      onConfigChange({
          ...config,
          enableThinking: isEnabled,
          thinkingBudget: isEnabled ? (config.model === ModelType.PRO ? 8192 : 2048) : 0
      });
  };

  const renderPreview = (att: Attachment, i: number) => {
      if (att.mimeType.startsWith('image/')) {
          return (
            <img 
              src={`data:${att.mimeType};base64,${att.data}`} 
              alt="preview" 
              className="w-16 h-16 object-cover rounded-md border border-gray-600"
            />
          );
      } else if (att.mimeType.startsWith('video/')) {
          return (
              <div className="w-16 h-16 bg-gray-800 rounded-md border border-gray-600 flex items-center justify-center relative overflow-hidden">
                  <video 
                    src={`data:${att.mimeType};base64,${att.data}`} 
                    className="w-full h-full object-cover opacity-50"
                  />
                  <Video size={20} className="absolute text-white z-10" />
              </div>
          );
      } else {
          return (
            <div className="w-16 h-16 bg-gray-800 rounded-md border border-gray-600 flex flex-col items-center justify-center p-1">
                <FileText size={20} className="text-gray-400 mb-1" />
                <span className="text-[9px] text-gray-300 text-center w-full truncate px-1">
                    {att.fileName || 'File'}
                </span>
            </div>
          );
      }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      
      {/* Configuration Bar */}
      <div className="flex justify-center mb-4 gap-2 flex-wrap">
         <button 
           onClick={toggleModel}
           className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
               config.model === ModelType.PRO 
               ? 'bg-purple-900/30 border-purple-700 text-purple-300' 
               : 'bg-[#2a2a2a] border-[#444] text-gray-300 hover:bg-[#333]'
           }`}
         >
            <Sparkles size={14} />
            {MODEL_LABELS[config.model]}
         </button>
         
         <button 
           onClick={toggleThinking}
           className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
               config.enableThinking
               ? 'bg-blue-900/30 border-blue-700 text-blue-300' 
               : 'bg-[#2a2a2a] border-[#444] text-gray-300 hover:bg-[#333]'
           }`}
         >
            <BrainCircuit size={14} />
            Reasoning: {config.enableThinking ? 'On' : 'Off'}
         </button>
      </div>

      <div 
        className={`relative bg-[#2f2f2f] rounded-xl shadow-lg border border-[#444] flex flex-col ${
            isDragOver ? 'border-blue-500 ring-2 ring-blue-500/20' : ''
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={async (e) => {
            e.preventDefault();
            setIsDragOver(false);
            if(e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                 await processFiles(e.dataTransfer.files);
            }
        }}
      >
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex gap-3 p-3 pb-0 overflow-x-auto">
            {attachments.map((att, i) => (
              <div key={i} className="relative group shrink-0">
                {renderPreview(att, i)}
                <button 
                  onClick={() => removeAttachment(i)}
                  className="absolute -top-1.5 -right-1.5 bg-gray-800 rounded-full p-0.5 border border-gray-600 hover:bg-red-900 hover:border-red-700 transition-colors z-20"
                >
                  <X size={12} className="text-gray-300" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end p-3 gap-2">
          {/* File Upload (General) */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#3f3f3f] rounded-full transition-colors shrink-0"
            title="Attach file"
          >
            <Paperclip size={20} />
          </button>
          
          {/* Video Upload (Specific) */}
          <button 
            onClick={() => videoInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#3f3f3f] rounded-full transition-colors shrink-0"
            title="Upload video"
          >
            <Video size={20} />
          </button>

          {/* Hidden Inputs */}
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/*, application/pdf, text/*, .js, .py, .html, .css, .json, .csv"
            multiple
            onChange={handleFileSelect}
          />
           <input 
            type="file" 
            ref={videoInputRef}
            className="hidden" 
            accept="video/*"
            multiple
            onChange={handleFileSelect}
          />
          
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={config.enableThinking ? "Ask anything (Reasoning enabled)..." : "Message Netfly Ai..."}
            className="w-full bg-transparent text-gray-100 placeholder-gray-500 text-sm md:text-base resize-none focus:outline-none max-h-[200px] py-2"
            rows={1}
            disabled={isLoading}
          />
          
          <button
            onClick={handleSend}
            disabled={(!input.trim() && attachments.length === 0) || isLoading}
            className={`p-2 rounded-lg transition-all shrink-0 ${
              (!input.trim() && attachments.length === 0) || isLoading
                ? 'bg-[#3f3f3f] text-gray-500 cursor-not-allowed'
                : 'bg-white text-black hover:bg-gray-200'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
      <div className="text-center mt-2 text-xs text-gray-500">
        Netfly Ai can make mistakes. Consider checking important information.
      </div>
    </div>
  );
};

export default ChatInput;