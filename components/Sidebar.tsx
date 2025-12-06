import React from 'react';
import { Plus, MessageSquare, Trash2, Settings, Download } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  toggleSidebar: () => void;
  onInstallApp: () => void;
  showInstallButton: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  toggleSidebar,
  onInstallApp,
  showInstallButton
}) => {
  return (
    <div 
      className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#171717] border-r border-[#333] transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:relative md:translate-x-0 flex flex-col`}
    >
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="flex items-center justify-start gap-3 w-full px-4 py-3 bg-[#e5e5e5] hover:bg-white text-black font-medium rounded-lg transition-colors"
        >
          <Plus size={20} />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="text-xs font-semibold text-gray-500 px-4 mb-2 uppercase tracking-wider">Recent</div>
        <div className="space-y-1">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`group flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                session.id === currentSessionId
                  ? 'bg-[#2f2f2f] text-gray-100'
                  : 'text-gray-400 hover:bg-[#262626] hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={16} className="shrink-0" />
                <span className="truncate">{session.title}</span>
              </div>
              <div 
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                onClick={(e) => onDeleteSession(session.id, e)}
              >
                <Trash2 size={14} />
              </div>
            </button>
          ))}
          {sessions.length === 0 && (
            <div className="px-4 py-4 text-sm text-gray-600 italic">
              No previous chats
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-[#333] space-y-2">
        {showInstallButton && (
          <button 
            onClick={onInstallApp}
            className="flex items-center gap-3 w-full px-2 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#262626] rounded-lg transition-colors"
          >
            <Download size={18} />
            <span>Install App</span>
          </button>
        )}
        
        <div className="flex items-center gap-3 text-sm text-gray-400 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
            NA
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-200">Netfly Ai User</div>
            <div className="text-xs text-gray-500">Free Plan</div>
          </div>
          <Settings size={18} className="cursor-pointer hover:text-gray-200" />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;