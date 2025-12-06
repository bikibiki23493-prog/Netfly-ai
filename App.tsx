
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Menu, Plus } from 'lucide-react';
import { Chat } from '@google/genai';

import Sidebar from './components/Sidebar';
import MessageBubble from './components/MessageBubble';
import ChatInput from './components/ChatInput';
import { Message, ChatSession, Role, Attachment, ChatConfig, ModelType } from './types';
import { createChat, sendMessageStream } from './services/geminiService';
import { INITIAL_GREETING, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './constants';

const App: React.FC = () => {
  // State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  
  const [chatConfig, setChatConfig] = useState<ChatConfig>({
      model: DEFAULT_MODEL,
      enableThinking: false,
      thinkingBudget: 0
  });

  // Refs for Chat instance
  const chatInstanceRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize or load sessions & PWA listener
  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone || 
                               document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };
    
    checkStandalone();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);

    // In a real app, load from local storage
    const initialSessionId = uuidv4();
    const initialSession: ChatSession = {
      id: initialSessionId,
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now()
    };
    setSessions([initialSession]);
    setCurrentSessionId(initialSessionId);

    // PWA Install Event Listener
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      console.log("Captured install prompt");
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkStandalone);
    };
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessions, currentSessionId]); // Scroll when messages change

  const getCurrentSession = () => sessions.find(s => s.id === currentSessionId);

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    chatInstanceRef.current = null; // Reset chat instance
    setIsSidebarOpen(false); // Close sidebar on mobile
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
        const newSessions = prev.filter(s => s.id !== id);
        if (currentSessionId === id && newSessions.length > 0) {
            setCurrentSessionId(newSessions[0].id);
            chatInstanceRef.current = null;
        } else if (newSessions.length === 0) {
             // Ensure there's always one session
             const newId = uuidv4();
             setCurrentSessionId(newId);
             chatInstanceRef.current = null;
             return [{
                 id: newId,
                 title: 'New Chat',
                 messages: [],
                 updatedAt: Date.now()
             }];
        }
        return newSessions;
    });
  };

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
          setInstallPrompt(null);
        } else {
          console.log('User dismissed the install prompt');
        }
      });
    } else {
      // Fallback for when automated prompt isn't available (e.g. iOS or already installed)
      alert("To install Netfly Ai on your phone:\n\n1. Tap the Share/Menu icon in your browser.\n2. Scroll down and select 'Add to Home Screen' or 'Install App'.");
    }
  };

  const handleSendMessage = async (text: string, attachments: Attachment[]) => {
    if (!currentSessionId) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: Role.USER,
      text: text,
      attachments: attachments,
      timestamp: Date.now()
    };

    // Update UI immediately with user message
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        // Update title if it's the first message
        const title = s.messages.length === 0 ? (text.slice(0, 30) || "Image Chat") : s.title;
        return {
          ...s,
          title,
          messages: [...s.messages, userMessage],
          updatedAt: Date.now()
        };
      }
      return s;
    }));

    setIsLoading(true);

    // Create placeholder for assistant message
    const assistantMessageId = uuidv4();
    const initialAssistantMessage: Message = {
        id: assistantMessageId,
        role: Role.MODEL,
        text: '',
        timestamp: Date.now(),
        isStreaming: true
    };

    setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
            return {
                ...s,
                messages: [...s.messages, initialAssistantMessage]
            };
        }
        return s;
    }));

    try {
      // Initialize chat if needed or config changed
      if (!chatInstanceRef.current) {
          chatInstanceRef.current = createChat(chatConfig);
      }

      const stream = sendMessageStream(chatInstanceRef.current, text, attachments);
      
      let fullResponse = '';

      for await (const chunk of stream) {
        fullResponse += chunk;
        setSessions(prev => prev.map(s => {
          if (s.id === currentSessionId) {
            const updatedMessages = s.messages.map(m => {
              if (m.id === assistantMessageId) {
                return { ...m, text: fullResponse };
              }
              return m;
            });
            return { ...s, messages: updatedMessages };
          }
          return s;
        }));
      }

      // Finalize message
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          const updatedMessages = s.messages.map(m => {
            if (m.id === assistantMessageId) {
              return { ...m, isStreaming: false };
            }
            return m;
          });
          return { ...s, messages: updatedMessages };
        }
        return s;
      }));

    } catch (error) {
      console.error("Chat error:", error);
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          const updatedMessages = s.messages.map(m => {
            if (m.id === assistantMessageId) {
              return { ...m, isStreaming: false, isError: true, text: "Sorry, I encountered an error processing your request." };
            }
            return m;
          });
          return { ...s, messages: updatedMessages };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Current session data
  const session = getCurrentSession();
  const messages = session?.messages || [];

  return (
    <div className="flex h-screen bg-[#212121] text-gray-100 overflow-hidden font-sans">
      <Sidebar 
        isOpen={isSidebarOpen}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={(id) => { setCurrentSessionId(id); setIsSidebarOpen(false); chatInstanceRef.current = null; }}
        onDeleteSession={handleDeleteSession}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onInstallApp={handleInstallClick}
        showInstallButton={!isStandalone} // Hide if already installed
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative w-full">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center p-4 border-b border-[#333] bg-[#212121]">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-400">
            <Menu size={24} />
          </button>
          <span className="ml-2 font-semibold">Netfly Ai</span>
          <button onClick={handleNewChat} className="ml-auto p-2 text-gray-400">
            <Plus size={24} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-0 animate-fadeIn" style={{animation: 'fadeIn 0.5s forwards'}}>
              <div className="bg-white/10 p-4 rounded-full mb-6">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 bg-black rounded-full" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold mb-2">How can I help you today?</h2>
            </div>
          ) : (
            <div className="flex flex-col pb-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-gradient-to-t from-[#212121] via-[#212121] to-transparent pt-10">
          <ChatInput 
            onSend={handleSendMessage} 
            isLoading={isLoading} 
            config={chatConfig}
            onConfigChange={(newConfig) => {
                setChatConfig(newConfig);
                chatInstanceRef.current = null; // Reset chat to apply new config on next message
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
