import React, { useState, useEffect, useRef } from 'react';
import Api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/Icon';

export const ChatTab = ({ doc }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatWindowRef = useRef(null);
  const { toast } = useToast();

  const suggestions = [
    'Who are the parties to this contract?',
    'When does this contract terminate?',
    'What are the payment terms?',
    'Are there any high-risk clauses?'
  ];

  useEffect(() => {
    let isMounted = true;
    async function loadChat() {
      try {
        const res = await Api.get(`/api/ai/documents/${doc.id}/chat`);
        if (isMounted) setMessages(res.messages || []);
      } catch (err) {
        if (isMounted) toast(err.message || 'Failed to load chat history', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadChat();
    return () => {
      isMounted = false;
    };
  }, [doc.id, toast]);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const handleSend = async (questionText) => {
    const q = (questionText || input).trim();
    if (!q || sending) return;

    setInput('');
    const userMsg = { id: `user-${Date.now()}`, role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const res = await Api.post(`/api/ai/documents/${doc.id}/chat`, { question: q });
      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        confidence: res.confidence,
        provider: res.provider,
        sources: res.sources || []
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      toast(err.message || 'AI request failed', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="spinner-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">
        <span className="dot" />
        AI Document Chatbot
      </div>

      <div className="chat-suggestions">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            className="chat-suggestion-btn"
            onClick={() => setInput(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="divider" />

      <div className="chat-window" id="chatWindow" ref={chatWindowRef}>
        {messages.length === 0 ? (
          <p className="text-lo" style={{ textAlign: 'center', padding: '24px 0' }}>
            Ask a question about this document — try the suggestions above.
          </p>
        ) : (
          messages.map((m, idx) => {
            if (m.role === 'user') {
              return (
                <div key={m.id || idx} className="chat-msg user">
                  {m.content}
                </div>
              );
            }

            let parsedSources = m.sources || [];
            if (typeof m.source_ref === 'string') {
              try {
                parsedSources = JSON.parse(m.source_ref);
              } catch (e) {
                parsedSources = [];
              }
            }

            return (
              <div key={m.id || idx} className="chat-msg assistant">
                {m.content}
                <div className="mt-8">
                  {m.confidence != null && (
                    <span className="badge badge-ok">
                      {m.provider === 'gemini' ? '✨ Gemini AI' : 'AI Engine'} · Confidence{' '}
                      {Math.round(m.confidence * 100)}%
                    </span>
                  )}
                  {parsedSources.map((s, sIdx) => (
                    <span key={sIdx} className="source-tag">
                      {s.text || `pg. ${s.pageRef}`}
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        )}

        {sending && (
          <div
            className="chat-msg assistant"
            style={{ color: 'var(--text-lo)', fontStyle: 'italic' }}
          >
            Thinking…
          </div>
        )}
      </div>

      <div className="chat-input-row">
        <input
          id="chatInput"
          placeholder="Ask about parties, payment, termination, jurisdiction…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="btn btn-primary" id="chatSendBtn" onClick={() => handleSend()}>
          <Icon.chat /> Send
        </button>
      </div>
    </div>
  );
};

export default ChatTab;
