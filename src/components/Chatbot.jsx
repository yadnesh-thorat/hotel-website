import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, MapPin, Sparkles, Navigation, Hotel, Compass, Maximize2, Minimize2 } from 'lucide-react';
import '../index.css';

const Chatbot = ({ currentUser, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! I am TripBuddy, your AI Travel Companion. 🌟 How can I help you plan your next amazing adventure today?', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Show welcome bubble after 3 seconds on first visit
    const timer = setTimeout(() => {
      if (!isOpen) setShowBubble(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const suggestions = [
    { icon: <Navigation size={14} />, text: "Plan a 3-day trip to any location" },
    { icon: <Hotel size={14} />, text: "Find budget hotels in India" },
    { icon: <Compass size={14} />, text: "Best times to visit Pune?" }
  ];

  const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      content: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages
        })
      });

      const data = await response.json();

      if (data.reply) {
        let replyText = data.reply;
        let action = null;

        // Check for any JSON actions in the reply
        const jsonMatch = replyText.match(/\{"action":\s*".*?".*?\}/);
        if (jsonMatch) {
          try {
            action = JSON.parse(jsonMatch[0]);
            // Clean up the text to not show the raw JSON to the user
            replyText = replyText.replace(jsonMatch[0], "");
          } catch (e) {
            console.error('Failed to parse action JSON', e);
          }
        }

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: replyText,
          action: action,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Oh no, I hit a little snag! 😅 Could you check if the API key is set up in the backend?',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not connect to the server.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleSuggestionClick = (text) => {
    setInput(text);
    // Note: We use setTimeout to allow state to update before sending, or just send directly
    setTimeout(() => {
      handleSendDirect(text);
    }, 0);
  };

  const handleSendDirect = async (text) => {
    if (!text.trim()) return;

    const userMessage = {
      role: 'user',
      content: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages
        })
      });

      const data = await response.json();

      if (data.reply) {
        let replyText = data.reply;
        let action = null;

        // Check for any JSON actions
        const jsonMatch = replyText.match(/\{"action":\s*".*?".*?\}/);
        if (jsonMatch) {
          try {
            action = JSON.parse(jsonMatch[0]);
            replyText = replyText.replace(jsonMatch[0], "");
          } catch (e) {
            console.error('Failed to parse action JSON', e);
          }
        }

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: replyText,
          action: action,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Oops! I lost my connection for a second. 📡 Could you check your internet or the server?',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I could not connect to the server. 🔌 Please check if the backend is running!',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = async (action, idx, msg) => {
    try {
      if (onAction) {
        await onAction(action);

        // Update local message to show success
        setMessages(prev => {
          const newMsgs = [...prev];
          let successText = "\n\n✅ **Confirmed!**";
          if (action.action === 'book_hotel') successText = "\n\n✅ **Hotel booked and added to your trip!**";
          if (action.action === 'create_trip') successText = "\n\n✅ **Trip plan created! You can see it on your dashboard.**";
          
          newMsgs[idx] = { ...msg, action: null, content: msg.content + successText };
          return newMsgs;
        });
      }
    } catch (e) {
      console.error('Action failed', e);
      alert('Sorry, I could not complete that action. Please try again.');
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        className="chatbot-toggle"
        onClick={() => {
          setIsOpen(!isOpen);
          setShowBubble(false);
        }}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: 'var(--primary-color, #2563eb)',
          color: 'white',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: 'none',
          cursor: 'pointer',
          zIndex: 1000
        }}
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}

        {/* Notification Bubble */}
        {showBubble && !isOpen && (
          <div
            style={{
              position: 'absolute',
              right: '70px',
              bottom: '10px',
              backgroundColor: 'white',
              color: '#1e293b',
              padding: '12px 16px',
              borderRadius: '12px 12px 0 12px',
              width: '180px',
              fontSize: '0.85rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              animation: 'slideInRight 0.5s ease-out',
              pointerEvents: 'none',
              fontWeight: 500,
              lineHeight: 1.4
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary-start)' }}>
              <Sparkles size={14} />
              <span>AI Assistant</span>
            </div>
            Do you need any help? I can plan your trip or book a hotel!
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="chatbot-window"
          style={{
            position: 'fixed',
            bottom: isExpanded ? '20px' : '90px',
            right: '20px',
            width: isExpanded ? 'calc(100% - 40px)' : '380px',
            height: isExpanded ? 'calc(100% - 110px)' : '600px',
            maxWidth: isExpanded ? '1200px' : '380px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, var(--color-primary-start, #4f46e5), var(--color-secondary, #ec4899))',
            color: 'white',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={20} />
              <span>TripLog AI Assistant</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', padding: '4px' }}
                title={isExpanded ? "Minimize" : "Expand"}
              >
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            padding: '15px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#f8fafc'
          }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                display: 'flex',
                flexDirection: 'row',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: '10px',
                maxWidth: '90%',
                alignItems: 'flex-end'
              }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--color-primary-start), var(--color-secondary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                    flexShrink: 0,
                    marginBottom: '4px'
                  }}>
                    <Sparkles size={16} />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div
                    style={{
                      backgroundColor: msg.role === 'user' ? 'var(--color-primary-start, #4f46e5)' : 'white',
                      color: msg.role === 'user' ? 'white' : '#1e293b',
                      padding: '12px 16px',
                      borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      boxShadow: msg.role === 'user' ? '0 4px 12px rgba(79, 70, 229, 0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
                      fontSize: '0.95rem',
                      lineHeight: '1.5',
                      border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
                      width: 'fit-content'
                    }}
                    dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }}
                  />

                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0 4px' }}>{msg.time}</span>

                  {msg.action && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                      {msg.action.action === 'book_hotel' && (
                        <>
                          <button
                            onClick={() => handleActionClick(msg.action, idx, msg)}
                            style={{ padding: '8px 14px', background: 'var(--color-success, #10b981)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)' }}
                          >
                            <Hotel size={14} /> Yes, book it
                          </button>
                          <button
                            onClick={() => {
                              setMessages(prev => {
                                const newMsgs = [...prev];
                                newMsgs[idx] = { ...msg, action: null };
                                return newMsgs;
                              });
                              handleSendDirect("No, show me another option.");
                            }}
                            style={{ padding: '8px 14px', background: 'white', color: 'var(--text-main)', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
                          >
                            No, show another
                          </button>
                        </>
                      )}
                      {msg.action.action === 'create_trip' && (
                        <>
                          <button
                            onClick={() => handleActionClick(msg.action, idx, msg)}
                            style={{ padding: '8px 14px', background: 'var(--color-primary-start, #4f46e5)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)' }}
                          >
                            <Compass size={14} /> Create Trip Plan
                          </button>
                          <button
                            onClick={() => {
                              setMessages(prev => {
                                const newMsgs = [...prev];
                                newMsgs[idx] = { ...msg, action: null };
                                return newMsgs;
                              });
                              handleSendDirect("I'll plan it myself, thanks.");
                            }}
                            style={{ padding: '8px 14px', background: 'white', color: 'var(--text-main)', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
                          >
                            No, thanks
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    flexShrink: 0,
                    marginBottom: '4px'
                  }}>
                    {currentUser ? currentUser.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div style={{ alignSelf: 'flex-start', color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic', padding: '0 10px' }}>
                <span className="typing-dot" style={{ animation: 'blink 1.4s infinite both', animationDelay: '0.2s' }}>.</span>
                <span className="typing-dot" style={{ animation: 'blink 1.4s infinite both', animationDelay: '0.4s' }}>.</span>
                <span className="typing-dot" style={{ animation: 'blink 1.4s infinite both', animationDelay: '0.6s' }}>.</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length === 1 && (
            <div style={{ padding: '10px 15px', display: 'flex', gap: '8px', overflowX: 'auto', backgroundColor: '#f8fafc', paddingBottom: '0' }} className="hide-scrollbar">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(s.text)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    padding: '8px 12px',
                    backgroundColor: 'white',
                    border: '1px solid #cbd5e1',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#1e293b'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569'; }}
                >
                  {s.icon} {s.text}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div style={{
            padding: '15px',
            background: 'white',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '10px',
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about destinations or hotels..."
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '1px solid #cbd5e1',
                borderRadius: '24px',
                outline: 'none',
                fontSize: '0.95rem',
                backgroundColor: '#f8fafc',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-start, #4f46e5)'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                backgroundColor: input.trim() ? 'var(--color-primary-start, #4f46e5)' : '#cbd5e1',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
