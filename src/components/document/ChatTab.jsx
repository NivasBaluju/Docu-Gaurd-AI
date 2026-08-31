import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/Icon';
import SkeletonLoader from '../common/SkeletonLoader';
import { buttonMotion, EASE_OUT } from '../../styles/motion';

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
    return <SkeletonLoader.Card count={1} height="320px" />;
  }

  return (
    <div className="card">
      <div className="card-title">
        <span className="dot" />
        AI Document Intelligence Assistant
      </div>

      <div className="chat-suggestions">
        {suggestions.map((s, idx) => (
          <motion.button
            key={idx}
            className="chat-suggestion-btn"
            onClick={() => setInput(s)}
            {...buttonMotion}
          >
            {s}
          </motion.button>
        ))}
      </div>

      <div className="divider" />

      <div className="chat-window" id="chatWindow" ref={chatWindowRef} style={{ minHeight: '260px' }}>
        {messages.length === 0 ? (
          <p className="text-lo" style={{ textAlign: 'center', padding: '32px 0' }}>
            Ask a legal question about this document or select a suggestion above.
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
              <motion.div
                key={m.id || idx}
                className="chat-msg assistant"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: EASE_OUT }}
              >
                {m.content}
                <div className="mt-8" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {m.confidence != null && (
                    <span className="badge badge-ok" style={{ fontSize: '11px' }}>
                      {m.provider === 'gemini' ? '✨ Gemini AI' : 'Legal AI'} · Confidence{' '}
                      {Math.round(m.confidence * 100)}%
                    </span>
                  )}
                  {parsedSources.map((s, sIdx) => (
                    <span key={sIdx} className="source-tag" style={{ fontSize: '11px' }}>
                      {s.text || `pg. ${s.pageRef}`}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })
        )}

        {sending && (
          <motion.div
            className="chat-msg assistant"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ color: 'var(--royal)', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span className="dot dot-gold" style={{ animation: 'pulse 1s infinite alternate' }} />
            <span style={{ fontSize: '13px' }}>Analyzing document context…</span>
          </motion.div>
        )}
      </div>

      <div className="chat-input-row" style={{ marginTop: '16px' }}>
        <input
          id="chatInput"
          placeholder="Ask about parties, payment, termination, jurisdiction…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: 1 }}
        />
        <motion.button
          className="btn btn-primary"
          id="chatSendBtn"
          onClick={() => handleSend()}
          disabled={sending || !input.trim()}
          {...buttonMotion}
        >
          <Icon.chat /> Send
        </motion.button>
      </div>
    </div>
  );
};

export default ChatTab;
