import { useState, useRef, useEffect } from 'react';

export default function MultiCategorySelect({ categories, primaryId, secondaryIds, onPrimaryChange, onSecondaryChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const primaryCat = categories.find(c => String(c.id) === String(primaryId));
  const secondaryCount = secondaryIds.length;

  function toggleSecondary(id) {
    const strId = String(id);
    const current = secondaryIds.map(String);
    if (current.includes(strId)) {
      onSecondaryChange(current.filter(i => i !== strId).map(Number));
    } else {
      onSecondaryChange([...current, strId].map(Number));
    }
  }

  function isPrimary(id) { return String(id) === String(primaryId); }
  function isSecondary(id) { return secondaryIds.map(String).includes(String(id)); }

  return (
    <div className="space-y-2" ref={ref}>
      {/* Primary category — required, shown in URL */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wide text-ink-600 mb-1.5">
          Primary Section <span className="text-press-red">*</span>
          <span className="text-ink-400 normal-case font-sans ml-1">(used in URL)</span>
        </label>
        <select
          required
          disabled={disabled}
          value={primaryId || ''}
          onChange={e => {
            const newPrimary = e.target.value;
            onPrimaryChange(newPrimary);
            // Remove new primary from secondary if it was there
            onSecondaryChange(secondaryIds.filter(id => String(id) !== newPrimary));
          }}
          className="w-full px-3 py-2.5 rounded border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-press-red/40 focus:border-press-red text-ink-900 disabled:bg-paper-100 disabled:text-ink-400"
        >
          <option value="">Choose primary section…</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Secondary categories — optional, multi-select */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wide text-ink-600 mb-1.5">
          Additional Sections
          <span className="text-ink-400 normal-case font-sans ml-1">(optional, article appears in multiple sections)</span>
        </label>

        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded border border-paper-200 bg-white focus:outline-none focus:ring-2 focus:ring-press-red/40 focus:border-press-red text-left disabled:bg-paper-100 disabled:text-ink-400"
          >
            <div className="flex flex-wrap gap-1.5 min-h-5">
              {secondaryCount === 0 ? (
                <span className="text-ink-300 text-sm">Select additional sections…</span>
              ) : (
                secondaryIds.map(id => {
                  const cat = categories.find(c => String(c.id) === String(id));
                  return cat ? (
                    <span key={id} className="flex items-center gap-1 bg-paper-100 border border-paper-200 rounded px-2 py-0.5 text-xs font-mono text-ink-700">
                      {cat.name}
                      {!disabled && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); toggleSecondary(id); }}
                          className="text-ink-400 hover:text-press-red ml-0.5"
                        >×</button>
                      )}
                    </span>
                  ) : null;
                })
              )}
            </div>
            <span className="text-ink-400 text-xs ml-2 flex-shrink-0">{open ? '▲' : '▼'}</span>
          </button>

          {/* Dropdown */}
          {open && !disabled && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-paper-200 rounded shadow-lg max-h-60 overflow-y-auto">
              {categories.map(cat => {
                const isPrim = isPrimary(cat.id);
                const isSec = isSecondary(cat.id);
                return (
                  <label
                    key={cat.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                      isPrim ? 'opacity-40 cursor-not-allowed bg-paper-50' : 'hover:bg-paper-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSec}
                      disabled={isPrim}
                      onChange={() => !isPrim && toggleSecondary(cat.id)}
                      className="accent-press-red w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-sm text-ink-900">{cat.name}</span>
                    {isPrim && (
                      <span className="text-xs font-mono text-press-red ml-auto">primary</span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {secondaryCount > 0 && (
          <p className="text-xs text-ink-400 mt-1">
            Article will appear in {secondaryCount + 1} section{secondaryCount > 0 ? 's' : ''} total.
          </p>
        )}
      </div>
    </div>
  );
}
