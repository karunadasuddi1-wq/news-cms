import { useState } from 'react';

export default function TagInput({ tags = [], onChange, disabled }) {
  const [input, setInput] = useState('');

  function addTag(raw) {
    const tag = raw.trim().toLowerCase().replace(/[^a-z0-9\u0C80-\u0CFF\s-]/g, '').trim();
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
    setInput('');
  }

  function removeTag(tag) {
    onChange(tags.filter(t => t !== tag));
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div>
      <div className={`min-h-10 flex flex-wrap gap-1.5 p-2 border border-paper-200 rounded bg-white focus-within:ring-2 focus-within:ring-press-red/40 focus-within:border-press-red ${disabled ? 'bg-paper-100' : ''}`}>
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 bg-paper-100 border border-paper-200 rounded px-2 py-0.5 text-xs font-mono text-ink-700">
            #{tag}
            {!disabled && (
              <button type="button" onClick={() => removeTag(tag)}
                className="text-ink-400 hover:text-press-red transition-colors ml-0.5 leading-none">
                ×
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => input.trim() && addTag(input)}
            placeholder={tags.length === 0 ? 'Type a tag and press Enter… (e.g. KSRTC, Siddaramaiah)' : ''}
            className="flex-1 min-w-24 text-sm outline-none bg-transparent text-ink-900 placeholder:text-ink-300"
          />
        )}
      </div>
      <p className="text-xs text-ink-400 mt-1">Press Enter or comma after each tag. Supports Kannada and English.</p>
    </div>
  );
}
