import { useState, useEffect, useRef } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import { Send, MessageSquare, Search } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import './ChatPanel.css';

interface Conversation {
  product_id: string;
  product_name: string;
  other_user_id: string;
  other_user_name: string;
  last_message_at: string;
  unread_count: string;
  last_message_text: string;
}

interface Message {
  message_id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  sent_at: string;
  is_read: boolean;
}

interface ChatPanelProps {
  targetProduct?: Product | null;
  onClearTarget?: () => void;
  onUnreadUpdate?: (count: number) => void;
}

export default function ChatPanel({ targetProduct, onClearTarget, onUnreadUpdate }: ChatPanelProps) {
  const { user, accessToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const selectedConvoRef = useRef<Conversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitedTarget = useRef(false);

  // Update ref whenever selectedConvo changes
  useEffect(() => {
    selectedConvoRef.current = selectedConvo;
  }, [selectedConvo]);

  useEffect(() => {
    if (onUnreadUpdate) {
      const total = conversations.reduce((sum, c) => sum + parseInt(c.unread_count || '0'), 0);
      onUnreadUpdate(total);
    }
  }, [conversations, onUnreadUpdate]);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/chat/conversations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convo: Conversation) => {
    try {
      const res = await fetch(`${API_BASE}/chat/thread/${convo.product_id}/${convo.other_user_id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages);
        // Mark as read
        await fetch(`${API_BASE}/chat/read/${convo.product_id}/${convo.other_user_id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include'
        });
        // Update unread count locally
        setConversations(prev => prev.map(c => 
          (c.product_id === convo.product_id && c.other_user_id === convo.other_user_id)
            ? { ...c, unread_count: '0' }
            : c
        ));
      }
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConvo) return;

    try {
      const res = await fetch(`${API_BASE}/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        credentials: 'include',
        body: JSON.stringify({
          productId: selectedConvo.product_id,
          receiverId: selectedConvo.other_user_id,
          messageText: newMessage
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => {
          if (prev.some(m => m.message_id === data.data.message_id)) return prev;
          return [...prev, data.data];
        });
        setNewMessage('');
        // Update last message in convo list
        setConversations(prev => prev.map(c => 
          (c.product_id === selectedConvo.product_id && c.other_user_id === selectedConvo.other_user_id)
            ? { ...c, last_message_text: newMessage, last_message_at: new Date().toISOString() }
            : c
        ));
      }
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  useEffect(() => {
    fetchConversations();

    // Initialize socket
    const socket = io(API_BASE, {
      path: '/socket.io',
      transports: ['websocket']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      if (user?.sub) {
        socket.emit('join', user.sub);
      }
    });

    socket.on('new_message', (msg: Message) => {
      const currentConvo = selectedConvoRef.current;
      if (currentConvo && 
          currentConvo.product_id === msg.product_id && 
          (msg.sender_id === currentConvo.other_user_id || msg.receiver_id === currentConvo.other_user_id)) {
        
        setMessages(prev => {
          // Prevent duplicates
          if (prev.some(m => m.message_id === msg.message_id)) return prev;
          return [...prev, msg];
        });

        // Mark as read immediately if it's from the other person
        if (msg.sender_id === currentConvo.other_user_id) {
          fetch(`/chat/read/${currentConvo.product_id}/${currentConvo.other_user_id}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${accessToken}` }
          });
        }
      }
    });

    socket.on('update_conversations', () => {
      fetchConversations();
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, user?.sub]);

  useEffect(() => {
    if (!loading && targetProduct && !hasInitedTarget.current && user) {
      hasInitedTarget.current = true;
      const existing = conversations.find(c => 
        String(c.product_id) === String(targetProduct.id) && 
        String(c.other_user_id) === String(targetProduct.seller_id)
      );

      if (existing) {
        setSelectedConvo(existing);
      } else {
        const tempConvo: Conversation = {
          product_id: String(targetProduct.id),
          product_name: targetProduct.name,
          other_user_id: String(targetProduct.seller_id),
          other_user_name: targetProduct.seller_name || 'Seller',
          last_message_at: new Date().toISOString(),
          unread_count: '0',
          last_message_text: 'Starting a new conversation...'
        };
        setConversations(prev => [tempConvo, ...prev]);
        setSelectedConvo(tempConvo);
      }
      onClearTarget?.();
    }
  }, [loading, targetProduct, conversations, user, onClearTarget]);

  useEffect(() => {
    if (selectedConvo) {
      fetchMessages(selectedConvo);
    }
  }, [selectedConvo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="chat-panel">
      {/* ── Chat Sidebar ── */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2 className="chat-sidebar-title">Messages</h2>
        </div>
        <div className="chat-convo-list">
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
               <div className="auth-spinner" style={{ borderTopColor: 'var(--accent-green)', margin: '0 auto' }} />
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No conversations yet
            </div>
          ) : (
            conversations.map((convo, idx) => (
              <div
                key={`${convo.product_id}-${convo.other_user_id}`}
                className={`chat-convo-item ${selectedConvo?.product_id === convo.product_id && selectedConvo?.other_user_id === convo.other_user_id ? 'active' : ''}`}
                onClick={() => setSelectedConvo(convo)}
              >
                <div className="convo-avatar">
                  {convo.other_user_name[0].toUpperCase()}
                </div>
                <div className="convo-info">
                  <div className="convo-top">
                    <span className="convo-name">{convo.other_user_name}</span>
                    <span className="convo-time">{formatDate(convo.last_message_at)}</span>
                  </div>
                  <div className="convo-preview">{convo.last_message_text}</div>
                  <div className="convo-product">{convo.product_name}</div>
                </div>
                {convo.unread_count !== '0' && (
                  <div className="nav-badge" style={{ alignSelf: 'center' }}>{convo.unread_count}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Chat Main Area ── */}
      <div className="chat-main">
        {selectedConvo ? (
          <>
            <div className="chat-header">
              <div className="convo-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                {selectedConvo.other_user_name[0].toUpperCase()}
              </div>
              <div className="chat-header-info">
                <div className="chat-header-name">{selectedConvo.other_user_name}</div>
                <div className="chat-header-product">{selectedConvo.product_name}</div>
              </div>
            </div>

            <div className="chat-messages">
              {messages.map((msg) => (
                <div
                  key={msg.message_id}
                  className={`message-bubble ${msg.sender_id === user?.sub ? 'message-sent' : 'message-received'}`}
                >
                  <div>{msg.message_text}</div>
                  <div className="message-time">{formatDate(msg.sent_at)}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSendMessage}>
              <div className="chat-input-wrap">
                <input
                  className="chat-input"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
              </div>
              <button className="chat-send-btn" type="submit">
                <Send size={16} strokeWidth={2.5} />
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty">
            <MessageSquare size={48} strokeWidth={1.5} style={{ opacity: 0.2 }} />
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
