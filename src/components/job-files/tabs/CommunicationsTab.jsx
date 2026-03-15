import { useState, useRef, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function getInitials(email) {
  if (!email) return '??';
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function CommunicationsTab({ job, onAddNote }) {
  const { user } = useAuth();
  const [newNote, setNewNote] = useState('');
  const [summary, setSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const initials = getInitials(user?.email);

  const handleAdd = () => {
    const text = newNote.trim();
    if (!text) return;
    const now = new Date();
    const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const entry = `${date} ${time}\n${initials}: ${text}`;
    onAddNote(entry);
    setNewNote('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleAdd();
    }
  };

  const hasSpeech = !!getSpeechRecognition();

  const toggleVoice = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim = transcript;
        }
      }
      setNewNote(prev => {
        // Replace everything after the last final transcript with interim
        const base = prev.endsWith(finalTranscript) ? prev : (prev ? prev + ' ' : '') + finalTranscript;
        return interim ? base + interim : base;
      });
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setListening(false);
    };

    recognition.start();
    setListening(true);
    // Capture current note as the base
    finalTranscript = newNote ? newNote + ' ' : '';
  }, [listening, newNote]);

  const handleSummarize = async () => {
    const notes = (job.internal_notes || '').trim();
    if (!notes) return;
    setSummarizing(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai/summarize-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to summarize');
      setSummary(data.summary);
    } catch (err) {
      console.error('Summarize failed:', err);
      setSummary('Failed to generate summary. Is the backend running?');
    } finally {
      setSummarizing(false);
    }
  };

  // Parse notes — each entry separated by double newline, already newest first
  const notes = (job.internal_notes || '').trim();
  const entries = notes
    ? notes.split(/\n{2,}/).filter(Boolean)
    : [];

  return (
    <div className="comm-simple">
      <div className="comm-input-section">
        <div className="comm-textarea-wrap">
          <textarea
            className="comm-textarea"
            placeholder="Add a note... (Cmd+Enter to submit)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
          />
          {hasSpeech && (
            <button
              type="button"
              className={`comm-voice-btn${listening ? ' active' : ''}`}
              onClick={toggleVoice}
              title={listening ? 'Stop listening' : 'Voice input'}
            >
              <span style={{ fontSize: '16px', lineHeight: 1 }}>{listening ? '🔴' : '🎤'}</span>
            </button>
          )}
        </div>
        {listening && <div className="comm-listening-indicator">Listening...</div>}
        <div className="comm-input-footer">
          <span className="comm-char-count">{newNote.length}/2000</span>
          <button
            className="btn-primary"
            onClick={handleAdd}
            disabled={!newNote.trim()}
          >
            Add Note
          </button>
        </div>
      </div>

      {/* Summary — hidden for now, enable later */}
      {false && entries.length > 0 && (
        <div className="comm-summary-section">
          <button
            className="comm-summarize-btn"
            onClick={handleSummarize}
            disabled={summarizing}
          >
            {summarizing ? 'Summarizing...' : 'Summarize Notes'}
          </button>
          {summary && (
            <div className="comm-summary-card">
              <div className="comm-summary-header">
                <span>AI Summary</span>
                <button className="comm-summary-close" onClick={() => setSummary(null)}>&times;</button>
              </div>
              <div className="comm-summary-body">{summary}</div>
            </div>
          )}
        </div>
      )}

      <div className="comm-history">
        {entries.length === 0 ? (
          <p className="comm-empty">No notes yet.</p>
        ) : (
          entries.map((entry, i) => {
            const lines = entry.split('\n');
            const dateLine = lines[0] || '';
            const bodyLine = lines.slice(1).join('\n');
            // Bold initials if line starts with "XX: "
            const initialsMatch = bodyLine.match(/^([A-Z]{2}):\s/);
            return (
              <div key={i} className="comm-entry">
                <div className="comm-entry-date">{dateLine}</div>
                {initialsMatch ? (
                  <div className="comm-entry-body">
                    <strong className="comm-entry-initials">{initialsMatch[1]}</strong>: {bodyLine.slice(initialsMatch[0].length)}
                  </div>
                ) : (
                  <div className="comm-entry-body">{bodyLine || dateLine}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
