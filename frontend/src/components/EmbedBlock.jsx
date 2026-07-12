import { useState } from 'react';

// Detect embed type from URL and return embed HTML
function getEmbedHtml(url) {
  if (!url) return null;
  url = url.trim();

  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    return {
      type: 'YouTube',
      html: `<div class="embed-video"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" title="YouTube video" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>`,
      preview: `https://www.youtube.com/embed/${ytMatch[1]}`,
      embedType: 'iframe',
    };
  }

  // Facebook video
  const fbVideoMatch = url.match(/facebook\.com\/.*\/videos\/(\d+)/);
  if (fbVideoMatch || url.includes('facebook.com/watch') || url.includes('fb.watch')) {
    return {
      type: 'Facebook',
      html: `<div class="embed-social"><iframe src="https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&width=734&show_text=false" width="734" height="412" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe></div>`,
      preview: null,
      embedType: 'facebook',
    };
  }

  // Instagram — use WordPress's native oEmbed auto-detection (a bare URL on
  // its own line) instead of the blockquote+script pattern, since <script>
  // tags get silently stripped by the rich text editor.
  if (url.includes('instagram.com/p/') || url.includes('instagram.com/reel/')) {
    const cleanUrl = url.split('?')[0].replace(/\/$/, '');
    return {
      type: 'Instagram',
      html: `<p>${cleanUrl}</p>`,
      preview: null,
      embedType: 'instagram',
    };
  }

  // Twitter / X — same reasoning as Instagram above.
  if (url.includes('twitter.com/') || url.includes('x.com/')) {
    return {
      type: 'Twitter/X',
      html: `<p>${url}</p>`,
      preview: null,
      embedType: 'twitter',
    };
  }

  // Generic iframe (for other video URLs)
  return {
    type: 'Video',
    html: `<div class="embed-video"><iframe src="${url}" frameborder="0" allowfullscreen></iframe></div>`,
    preview: url,
    embedType: 'iframe',
  };
}

export default function EmbedBlock({ onInsert, disabled }) {
  const [url, setUrl] = useState('');
  const [embed, setEmbed] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  function handleDetect() {
    setError('');
    const result = getEmbedHtml(url);
    if (!result) {
      setError('Please enter a valid video URL.');
      return;
    }
    setEmbed(result);
  }

  function handleInsert() {
    if (!embed) return;
    onInsert('\n\n' + embed.html + '\n\n');
    setUrl('');
    setEmbed(null);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-paper-200 rounded bg-white hover:bg-paper-50 transition-colors disabled:opacity-50 text-ink-700"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Embed video
      </button>
    );
  }

  return (
    <div className="border border-paper-200 rounded bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wide text-ink-600 font-bold">Embed Video</span>
        <button type="button" onClick={() => { setOpen(false); setEmbed(null); setUrl(''); setError(''); }}
          className="text-ink-400 hover:text-ink-700 text-sm">✕</button>
      </div>

      <p className="text-xs text-ink-400">
        Paste a YouTube, Facebook, Instagram, or Twitter/X URL below.
      </p>

      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => { setUrl(e.target.value); setEmbed(null); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleDetect())}
          placeholder="https://www.youtube.com/watch?v=… or any video URL"
          className="flex-1 px-3 py-2 rounded border border-paper-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-press-red/40 focus:border-press-red"
        />
        <button type="button" onClick={handleDetect}
          className="px-3 py-2 bg-ink-900 hover:bg-ink-700 text-white text-sm rounded font-medium transition-colors">
          Detect
        </button>
      </div>

      {error && <p className="text-xs text-press-red">{error}</p>}

      {embed && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <span className="bg-paper-100 border border-paper-200 rounded px-2 py-0.5 font-mono font-bold">{embed.type}</span>
            <span>embed detected</span>
          </div>

          {embed.embedType === 'iframe' && embed.preview && (
            <div className="rounded overflow-hidden border border-paper-200 bg-black" style={{ aspectRatio: '16/9' }}>
              <iframe
                src={embed.preview}
                className="w-full h-full"
                frameBorder="0"
                allowFullScreen
                title="Preview"
              />
            </div>
          )}

          {embed.embedType !== 'iframe' && (
            <div className="bg-paper-50 border border-paper-200 rounded p-3 text-xs font-mono text-ink-500 break-all">
              {embed.type} embed will appear in the article at this position.
            </div>
          )}

          <div className="bg-paper-50 border border-paper-200 rounded p-2 text-xs font-mono text-ink-400 break-all max-h-20 overflow-auto">
            {embed.html.slice(0, 200)}…
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={handleInsert}
              className="flex-1 bg-ink-900 hover:bg-ink-700 text-white text-sm font-medium py-2 rounded transition-colors">
              Insert into article
            </button>
            <button type="button" onClick={() => { setEmbed(null); setUrl(''); }}
              className="px-4 py-2 border border-paper-200 text-sm text-ink-600 rounded hover:bg-paper-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
