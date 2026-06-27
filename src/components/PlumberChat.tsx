import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Phone, X, MessageSquare, Wrench, CheckCheck } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'plumber';
  text: string;
  timestamp: string;
  read: boolean;
}

interface Plumber {
  name: string;
  phone: string;
  avatar: string;
  status: string;
}

export const PLUMBERS: Plumber[] = [
  { name: 'Sipho Khumalo', phone: '+27 72 455 1209', avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80', status: 'Senior Master Plumber' },
  { name: 'Johan de Beer', phone: '+27 83 291 3844', avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80', status: 'Drainage Specialist' },
  { name: 'Bongani Dlamini', phone: '+27 61 784 9301', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', status: 'Emergency Response Lead' }
];

export function getAssignedPlumber(calloutId: string): Plumber {
  let sum = 0;
  for (let i = 0; i < calloutId.length; i++) {
    sum += calloutId.charCodeAt(i);
  }
  return PLUMBERS[sum % PLUMBERS.length];
}

interface PlumberChatProps {
  calloutId: string;
  onClose: () => void;
}

export default function PlumberChat({ calloutId, onClose }: PlumberChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const plumber = getAssignedPlumber(calloutId);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load chat messages
  useEffect(() => {
    const savedMessages = localStorage.getItem(`plumb_chat_${calloutId}`);
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    } else {
      // Seed a friendly greeting from the plumber
      const initial: ChatMessage[] = [
        {
          id: 'welcome-1',
          sender: 'plumber',
          text: `Hi! I've been dispatched to your property. I am preparing my gear right now. Please let me know if you have any quick questions or details about the issue.`,
          timestamp: new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
          read: true
        }
      ];
      setMessages(initial);
      localStorage.setItem(`plumb_chat_${calloutId}`, JSON.stringify(initial));
    }
  }, [calloutId]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const saveMessages = (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    localStorage.setItem(`plumb_chat_${calloutId}`, JSON.stringify(newMessages));
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
      read: true
    };

    const updated = [...messages, userMsg];
    saveMessages(updated);
    setInputText('');

    // Trigger plumber smart simulated response
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const plumberReplyText = getSmartReply(text);
      const plumberMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'plumber',
        text: plumberReplyText,
        timestamp: new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
        read: true
      };
      saveMessages([...updated, plumberMsg]);
    }, 1800);
  };

  const getSmartReply = (userText: string): string => {
    const text = userText.toLowerCase();
    
    if (text.includes('where') || text.includes('arrive') || text.includes('how long') || text.includes('eta') || text.includes('far')) {
      return `I'm currently en route! According to GPS, I should be at your property in about 12-15 minutes. Just finishing up with Pretoria traffic. Please keep a parking spot open if possible.`;
    }
    
    if (text.includes('valve') || text.includes('water') || text.includes('stop') || text.includes('shut') || text.includes('turn off')) {
      return `Yes! If possible, please locate your main municipal water shut-off valve (usually situated near the front street boundary, or under the kitchen sink) and turn it clockwise to close it. This will immediately stop the flow and minimize water damage!`;
    }

    if (text.includes('pay') || text.includes('cost') || text.includes('price') || text.includes('card') || text.includes('eft') || text.includes('surcharge')) {
      return `You can securely pay the call-out fee and any extra labor or materials directly inside the app. Once you approve on site, I will update your dispatch board invoice to Paid. All major cards and EFT are supported!`;
    }

    if (text.includes('geyser') || text.includes('burst') || text.includes('hot water') || text.includes('solar')) {
      return `Since it is a geyser issue, please locate your main electrical DB board and switch off the "Geyser" circuit breaker immediately. This prevents the heating element from burning out and avoids electrical risks!`;
    }

    if (text.includes('toilet') || text.includes('block') || text.includes('clog') || text.includes('sewer')) {
      return `Understood. Please avoid flushing the toilet or running any nearby taps or showers in the meantime to prevent backflow and overflow. I am bringing the high-pressure drain rods and plunger equipment.`;
    }

    if (text.includes('leak') || text.includes('flood') || text.includes('burst') || text.includes('spray')) {
      return `Got it, I'm bringing copper pipe sleeves, soldering gear, and heavy clamps. If the spray is heavy, laying a few dry towels can buy us some time. On my way!`;
    }

    // Default responses
    const responses = [
      `Understood. I am on my way with a fully stocked response truck. If anything changes, just let me know here!`,
      `Thank you for the update. I have noted that details. I'm driving as fast as safety allows. See you shortly!`,
      `Got it. I'm preparing the specialized tooling for this specific issue. Will alert you as soon as I pull up.`,
      `Perfect, thank you. Please ensure the path to the issue area is clear so we can begin repairs immediately when I arrive.`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const cannedQuestions = [
    { label: "📍 What is your ETA?", text: "Where are you now and what is your ETA?" },
    { label: "🚰 Should I shut off main water?", text: "Should I turn off the main water valve?" },
    { label: "💳 Can I pay by card/EFT?", text: "What payment methods do you accept and how do I pay?" },
    { label: "🔥 It's a burst geyser!", text: "My geyser burst! What should I do right now?" }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Background click close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Chat Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-3xl shadow-high w-full max-w-lg h-[600px] flex flex-col z-10 overflow-hidden border-2 border-slate-200"
      >
        {/* Chat Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={plumber.avatar}
                alt={plumber.name}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
            </div>
            <div>
              <h4 className="font-display font-black text-sm tracking-tight">{plumber.name}</h4>
              <p className="text-[10px] text-slate-300 font-mono tracking-wide uppercase">{plumber.status}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <a
              href={`tel:${plumber.phone}`}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition text-white"
              title={`Call Plumber at ${plumber.phone}`}
            >
              <Phone className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition text-white"
              title="Close Chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Warning Indicator */}
        <div className="bg-red-50 px-4 py-2 border-b border-red-100 flex items-center space-x-2 text-[10px] font-bold text-red-800">
          <Wrench className="w-3.5 h-3.5 text-red-600 animate-spin" />
          <span>PLUMBER ASSIGNED & SYNCED • RESPONSE CHANNEL ACTIVE</span>
        </div>

        {/* Messages Logger */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {messages.map((msg) => {
            const isMe = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end space-x-2`}
              >
                {!isMe && (
                  <img
                    src={plumber.avatar}
                    alt={plumber.name}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                  />
                )}
                <div className="max-w-[75%]">
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs ${
                      isMe
                        ? 'bg-red-600 text-white rounded-br-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <div className={`flex items-center space-x-1 mt-1 text-[9px] text-slate-400 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span>{msg.timestamp}</span>
                    {isMe && <CheckCheck className="w-3 h-3 text-red-500" />}
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex justify-start items-center space-x-2">
              <img
                src={plumber.avatar}
                alt={plumber.name}
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-full object-cover shrink-0"
              />
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestion Prompts */}
        <div className="px-4 py-2 border-t border-slate-100 bg-white overflow-x-auto whitespace-nowrap flex gap-2 scrollbar-none">
          {cannedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(q.text)}
              disabled={isTyping}
              className="text-[10px] font-bold border border-slate-200 hover:border-red-500 hover:bg-red-50 text-slate-600 hover:text-red-700 px-2.5 py-1.5 rounded-full transition shrink-0 disabled:opacity-50"
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Message Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputText);
          }}
          className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isTyping}
            placeholder={isTyping ? `${plumber.name} is typing...` : "Type a secure response..."}
            className="flex-1 bg-slate-100 border-none rounded-full py-2.5 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isTyping || !inputText.trim()}
            className="bg-red-600 hover:bg-red-700 disabled:bg-slate-200 text-white p-2.5 rounded-full transition flex items-center justify-center shrink-0 shadow-md hover:shadow-lg active:scale-95 disabled:shadow-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
