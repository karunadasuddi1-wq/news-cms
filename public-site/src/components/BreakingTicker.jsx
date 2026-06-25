export default function BreakingTicker({ articles = [] }) {
  if (!articles.length) return null;
  const text = articles.slice(0, 8).map(a => a.title).join('   ●   ');

  return (
    <div className="flex items-center bg-white border-b border-gray-200 overflow-hidden" style={{ height: 36 }}>
      <div className="flex-shrink-0 px-3 py-1 text-white text-xs font-ui font-bold uppercase tracking-wider" style={{ background: '#c0392b' }}>
        ತಾಜಾ ಸುದ್ದಿ
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div className="ticker-inner inline-block text-sm font-kannada text-gray-700 px-4">
          {text}
        </div>
      </div>
    </div>
  );
}
