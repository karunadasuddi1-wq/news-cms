export default function Modal({ title, onClose, children, wide = false }) {
  return (
    <div
      className="fixed inset-0 bg-ink-900/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-paper-50 rounded-lg shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[88vh] overflow-y-auto scrollbar-thin border border-paper-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-paper-200">
          <h2 className="font-display font-bold text-lg text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-press-red text-xl leading-none w-7 h-7 flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
