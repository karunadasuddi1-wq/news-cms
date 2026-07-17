import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import ImageUpload from '../components/ImageUpload';
import EmailOtpGate from '../components/EmailOtpGate';

function Bubble({ from, children, tone }) {
  const isMe = from === 'me';
  const toneClasses = {
    success: 'bg-wire-teal/10 border border-wire-teal/30 text-wire-teal-dark',
    error: 'bg-press-red/10 border border-press-red/30 text-press-red',
  };
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
          tone
            ? toneClasses[tone] + ' rounded-bl-sm'
            : isMe
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

const SESSION_KEY_PREFIX = 'guest_chat_session_';

export default function WhatsAppSubmit() {
  const { token } = useParams();
  const scrollRef = useRef(null);

  const [sessionToken, setSessionToken] = useState(() => sessionStorage.getItem(SESSION_KEY_PREFIX + token) || null);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [otpRequired, setOtpRequired] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [stage, setStage] = useState('name');
  const [messages, setMessages] = useState([]);
  const [submitterName, setSubmitterName] = useState('');
  const [pendingImage, setPendingImage] = useState('');
  const [input, setInput] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [sending, setSending] = useState(false);
  const [articleCount, setArticleCount] = useState(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    client.get('/public/guest-submission-config')
      .then(res => setOtpRequired(res.data.otpRequired))
      .catch(() => setOtpRequired(true));
  }, []);

  useEffect(() => {
    if (otpRequired === null) return;

    if (!otpRequired) {
      setMessages([{ from: 'them', text: "👋 Hi! Before we start — what's your name?" }]);
      setLoadingHistory(false);
      return;
    }

    if (!sessionToken) {
      setLoadingHistory(false);
      return;
    }

    client.get('/public/guest-chat/history', { headers: { Authorization: `Bearer ${sessionToken}` } })
      .then(res => {
        const history = res.data.messages || [];
        if (history.length > 0) {
          setMessages(history.map(m => ({ from: m.fromType, text: m.text, image: m.imageUrl, tone: m.tone })));
          setStage('content');
          setArticleCount(history.filter(m => m.tone === 'success').length);
        } else {
          setMessages([{ from: 'them', text: "👋 Hi! Before we start — what's your name?" }]);
        }
      })
      .catch(() => {
        sessionStorage.removeItem(SESSION_KEY_PREFIX + token);
        setSessionToken(null);
      })
      .finally(() => setLoadingHistory(false));
  }, [sessionToken, token, otpRequired]);

  function handleVerified(newSessionToken, email) {
    sessionStorage.setItem(SESSION_KEY_PREFIX + token, newSessionToken);
    setSessionToken(newSessionToken);
    setVerifiedEmail(email);
    setLoadingHistory(true);
  }

  async function sendText() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');

    if (stage === 'name') {
      setSubmitterName(text);
      setMessages((m) => [
        ...m,
        { from: 'me', text },
        {
          from: 'them',
          text: `Great to meet you, ${text.split(' ')[0]}! Now just send your articles one at a time, as plain text — each message you send becomes its own separate draft. Attach a photo right before a message to use it as that article's featured image.`,
        },
      ]);
      setStage('content');
      return;
    }

    setMessages((m) => [...m, { from: 'me', text }]);

    if (text.length < 50) {
      setMessages((m) => [
        ...m,
        { from: 'them', tone: 'error', text: "That's a bit short to be a full article (needs at least 50 characters) — it wasn't saved. Send the full piece and I'll file it." },
      ]);
      return;
    }

    setSending(true);
    const imageForThis = pendingImage;
    setPendingImage('');

    const derivedTitle = text.split('\n')[0].trim().slice(0, 70);

    try {
      await client.post('/public/guest-articles', {
        token,
        title: derivedTitle,
        content: text,
        featuredImage: imageForThis,
        submitterName,
        source: 'chat',
      }, sessionToken ? { headers: { Authorization: `Bearer ${sessionToken}` } } : undefined);
      setArticleCount((c) => c + 1);
      setMessages((m) => [
        ...m,
        { from: 'them', tone: 'success', text: "✅ Saved as a draft. Send the next one whenever you're ready." },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { from: 'them', tone: 'error', text: `⚠️ ${err.response?.data?.error || "Couldn't save that one — please try sending it again."}` },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  }

  function handleImageUpload(url) {
    setPendingImage(url);
    setMessages((m) => [...m, { from: 'me', image: url }]);
    setShowUpload(false);
  }

  if (otpRequired && !sessionToken) {
    return <EmailOtpGate token={token} onVerified={handleVerified} />;
  }

  if (loadingHistory) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-50">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-400">Loading your conversation…</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-paper-50 max-w-lg mx-auto border-x border-paper-200">
      <div className="bg-ink-900 text-white px-4 py-3.5 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-full bg-press-red flex items-center justify-center font-display font-bold text-sm">
          ED
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">Editorial Desk</p>
          <p className="text-[11px] text-white/60 leading-tight truncate">{verifiedEmail || 'Story submissions'}</p>
        </div>
        {articleCount > 0 && (
          <div className="text-[11px] font-mono bg-wire-teal/20 text-wire-teal-dark border border-wire-teal/30 rounded-full px-2.5 py-1">
            {articleCount} saved
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((m, i) =>
          m.image ? (
            <ImageBubble key={i} url={m.image} />
          ) : (
            <Bubble key={i} from={m.from} tone={m.tone}>{m.text}</Bubble>
          )
        )}
        {sending && (
          <div className="flex justify-start mb-3">
            <div className="bg-white border border-paper-200 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-ink-400">
              Saving…
            </div>
          </div>
        )}
      </div>

      {stage === 'content' && (
        <div className="px-4 pb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUpload((s) => !s)}
            className="text-xs font-medium text-ink-600 hover:text-ink-900 border border-paper-200 rounded-full px-3 py-1.5"
          >
            📎 {pendingImage ? 'Photo attached — will use next' : 'Attach photo for next article'}
          </button>
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
          placeholder={stage === 'name' ? 'Type your name…' : 'Paste or type an article, then send…'}
          className="flex-1 resize-none border border-paper-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink-900 max-h-32"
        />
        <button
          type="button"
          onClick={sendText}
          disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-full bg-press-red hover:bg-press-red-dark disabled:opacity-40 disabled:hover:bg-press-red text-white flex items-center justify-center shrink-0 transition-colors"
          aria-label="Send"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
