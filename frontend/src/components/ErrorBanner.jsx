export default function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="bg-press-red/10 border border-press-red/30 text-press-red-dark text-sm rounded px-4 py-2.5 mb-4">
      {message}
    </div>
  );
}
