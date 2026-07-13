import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import ImageUpload from '../components/ImageUpload';

function Bubble({ from, children }) {
  const isMe = from === 'me';
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
          isMe
            ? 'bg-press-red text-white rounded-br-sm'
            : 'bg-white border border-paper-200 text-ink-900 rounded-bl-sm'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function ImageBubble({ url }) {
  return (
    <div className="flex justify-end mb-3">
      <div className="max-w-[70%] rounded-2xl overflow-hidden border-2 border-press-red rounded-br-sm">
        <img src={url} alt="Attached" className="block w-full" />
      </div>
    </div>
  );
}

export default function WhatsAppSubmit() {
  const { token } = useParams();
  const scrollRef = useRef(null);

  const [stage, setStage] = useState('name');
  const [messages, setMessages] = useState([
    { from: 'them', text: "👋 Hi! Before we start — what's your name?" },
  ]);
  const [submitterName, setSubmitterName] = useState('');
  const [draft, setDraft] = useState([]);
  const [featuredImage, setFeaturedImage] = useState('');
  const [input, setInput] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function sendText() {
    const text = input.trim();
    if (!text) return;

    if (stage === 'name') {
      setSubmitterName(text);
      setMessages((m) => [
        ...m,
        { from: 'me', text },
        {
          from: 'them',
          text: `Great to meet you, ${text.split(' ')[0]}! Now go ahead and paste or type your article. You can send it in as many messages as you like — attach a photo too if you have one — then tap Submit when you're done.`,
        },
      ]);
      setStage('content');
    } else {
      setMessages((m) => [...m, { from: 'me', text }]);
      setDraft((d) => [...d, text]);
    }
    setInput('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  }

  function handleImageUpload(url) {
    setFeaturedImage(url);
    setMessages((m) => [...m, { from: 'me', image: url }]);
    setShowUpload(false);
  }

  async function handleSubmit() {
    setError('');
    const content = draft.join('\n\n');

    if (content.trim().length < 50) {
      setError('Send a bit more content first — at least a few sentences — before submitting.');
      return;
    }

    const derivedTitle = draft[0].slice(0, 70).trim();

    setSubmitting(true);
    try {
      await client.post('/public/guest-articles', {
        token,
        title: derivedTitle,
        content,
        featuredImage,
        submitterName,
      });
      setMessages((m) => [...m, { from: 'them', text: '✅ Got it — this is now in the review queue. Thank you!' }]);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong submitting your article. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-paper-50 max-w-lg mx-auto border-x border-paper-200">
      <div className="bg-ink-900 text-white px-4 py-3.5 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-full bg-press-red flex items-center justify-center font-display font-bold text-sm">
          ED
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">Editorial Desk</p>
          <p className="text-[11px] text-white/60 leading-tight">Story submissions</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((m, i) =>
          m.image ? (
            <ImageBubble key={i} url={m.image} />
          ) : (
            <Bubble key={i} from={m.from}>{m.text}</Bubble>
          )
        )}
      </div>

      {error && (
        <div className="mx-4 mb-2 bg-press-red/10 border border-press-red/30 text-press-red text-xs rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {done ? (
        <div className="p-4 text-center text-xs text-ink-400 border-t border-paper-200">
          Submission complete — you can close this page.
        </div>
      ) : (
        <>
          {stage === 'content' && (
            <div className="px-4 pb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowUpload((s) => !s)}
                className="text-xs font-medium text-ink-600 hover:text-ink-900 border border-paper-200 rounded-full px-3 py-1.5"
              >
                📎 Attach photo
              </button>
              {draft.length > 0 && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="text-xs font-semibold text-white bg-wire-teal hover:bg-wire-teal-dark rounded-full px-4 py-1.5 disabled:opacity-60 ml-auto"
                >
                  {submitting ? 'Submitting…' : '✓ Submit Article'}
                </button>
              )}
            </div>
          )}

          {showUpload && (
            <div className="px-4 pb-2">
              <ImageUpload label="Upload photo" onUpload={handleImageUpload} />
            </div>
          )}

          <div className="border-t border-paper-200 bg-white p-3 flex items-end gap-2 shrink-0">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={stage === 'name' ? 'Type your name…' : 'Type or paste your article…'}
              className="flex-1 resize-none border border-paper-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink-900 max-h-32"
            />
            <button
              type="button"
              onClick={sendText}
              disabled={!input.trim()}
              className="w-10 h-10 rounded-full bg-press-red hover:bg-press-red-dark disabled:opacity-40 disabled:hover:bg-press-red text-white flex items-center justify-center shrink-0 transition-colors"
              aria-label="Send"
            >
              ➤
            </button>
          </div>
        </>
      )}
    </div>
  );
}
