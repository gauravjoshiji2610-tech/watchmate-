import React, { useState } from 'react';
import { Send, MessageSquare, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export interface ChatPanelProps {
  displayName: string;
}

interface MockMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isSelf: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ displayName }) => {
  const [messages, setMessages] = useState<MockMessage[]>([
    {
      id: '1',
      sender: 'System',
      text: 'Connected to room chat. Last 50 messages history buffer enabled.',
      time: '12:00 PM',
      isSelf: false,
    },
  ]);
  const [text, setText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    if (text.length > 1000) {
      toast.error('Message exceeds 1000 character limit!');
      return;
    }

    const newMessage: MockMessage = {
      id: String(Date.now()),
      sender: displayName || 'You',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setText('');
  };

  return (
    <div className="w-full lg:w-80 h-full bg-slate-950/90 rounded-2xl border border-slate-800/80 flex flex-col overflow-hidden shadow-2xl shrink-0">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
          <MessageSquare size={16} className="text-brand-400" />
          <span>Room Chat</span>
        </div>
        <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full font-mono">
          Last 50 msgs
        </span>
      </div>

      {/* Messages List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.isSelf ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5 px-1">
              <span className="font-semibold text-slate-300">{m.sender}</span>
              <span>•</span>
              <span>{m.time}</span>
            </div>
            <div
              className={`p-2.5 rounded-2xl text-xs max-w-[85%] break-words leading-relaxed ${
                m.isSelf
                  ? 'bg-brand-600 text-white rounded-br-none'
                  : m.sender === 'System'
                  ? 'bg-slate-900 border border-slate-800 text-slate-400 italic text-[11px]'
                  : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Rate Limit Notice */}
      <div className="px-3 py-1.5 bg-slate-900/80 border-t border-slate-800/60 flex items-center gap-1.5 text-[10px] text-slate-400">
        <ShieldAlert size={12} className="text-brand-400 shrink-0" />
        <span>Rate limit: max 10 messages per 10 seconds</span>
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="py-2 text-xs"
        />
        <Button type="submit" size="sm" className="p-2.5 shrink-0" aria-label="Send message">
          <Send size={14} />
        </Button>
      </form>
    </div>
  );
};
