import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Bot, User, FileText, Download } from 'lucide-react';
import { Message, Role, Attachment } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.USER;
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderAttachment = (att: Attachment, idx: number) => {
      if (att.mimeType.startsWith('image/')) {
          return (
            <img 
                key={idx} 
                src={`data:${att.mimeType};base64,${att.data}`} 
                alt={att.fileName || "User image"} 
                className="h-48 w-auto object-cover rounded-lg border border-gray-700 hover:opacity-90 transition-opacity"
            />
          );
      } else if (att.mimeType.startsWith('video/')) {
          return (
              <div key={idx} className="max-w-sm rounded-lg overflow-hidden border border-gray-700 bg-black">
                   <video 
                     controls 
                     className="w-full max-h-[300px]"
                     src={`data:${att.mimeType};base64,${att.data}`} 
                   >
                       Your browser does not support the video tag.
                   </video>
                   {att.fileName && <div className="p-2 text-xs text-gray-400 truncate">{att.fileName}</div>}
              </div>
          );
      } else if (att.mimeType.startsWith('audio/')) {
           return (
               <div key={idx} className="w-full max-w-sm bg-[#2f2f2f] p-3 rounded-lg border border-gray-700 flex flex-col gap-2">
                    {att.fileName && <div className="text-xs text-gray-400 flex items-center gap-1"><FileText size={12}/> {att.fileName}</div>}
                   <audio controls src={`data:${att.mimeType};base64,${att.data}`} className="w-full h-8" />
               </div>
           );
      } else {
          // Generic file (PDF, Text, etc)
          return (
              <div key={idx} className="flex items-center gap-3 bg-[#2f2f2f] p-3 rounded-lg border border-gray-700 max-w-xs hover:bg-[#3a3a3a] transition-colors">
                  <div className="bg-blue-900/50 p-2 rounded text-blue-200">
                      <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-200 truncate">{att.fileName || 'Document'}</div>
                      <div className="text-xs text-gray-500 uppercase">{att.mimeType.split('/')[1] || 'FILE'}</div>
                  </div>
              </div>
          );
      }
  };

  return (
    <div className={`w-full py-6 md:py-8 ${isUser ? '' : 'bg-[#1a1a1a]'} border-b border-transparent`}>
      <div className="max-w-3xl mx-auto px-4 md:px-6 flex gap-4 md:gap-6">
        <div className="shrink-0 flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-[#333]' : 'bg-green-600'
          }`}>
            {isUser ? <User size={18} className="text-gray-300" /> : <Bot size={18} className="text-white" />}
          </div>
        </div>

        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm text-gray-200">
              {isUser ? 'You' : 'Netfly Ai'}
            </span>
            {!isUser && !message.isStreaming && (
              <button
                onClick={handleCopy}
                className="text-gray-500 hover:text-gray-300 transition-colors p-1"
                title="Copy response"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}
          </div>

          <div className="prose prose-invert prose-p:leading-7 prose-pre:bg-[#252525] max-w-none text-gray-300">
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {message.attachments.map((att, idx) => renderAttachment(att, idx))}
              </div>
            )}
            
            {message.text ? (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  code({node, inline, className, children, ...props}: any) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <div className="relative group">
                         <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">
                                {match[1]}
                            </span>
                         </div>
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </div>
                    ) : (
                      <code className={`${className} bg-[#333] px-1 py-0.5 rounded text-sm`} {...props}>
                        {children}
                      </code>
                    )
                  }
                }}
              >
                {message.text}
              </ReactMarkdown>
            ) : (
                // Show thinking indicator or empty state
                message.isStreaming ? (
                    <div className="flex items-center gap-2 text-gray-500">
                         <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                         <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-75"></span>
                         <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></span>
                    </div>
                ) : null
            )}
            {message.isStreaming && message.text && (
               <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse align-middle" />
            )}
          </div>
          
          {message.isError && (
             <div className="mt-2 text-red-400 text-sm bg-red-900/20 p-2 rounded border border-red-900/50">
                 Failed to generate response. Please try again.
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;