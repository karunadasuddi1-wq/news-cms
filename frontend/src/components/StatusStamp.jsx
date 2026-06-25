const STYLES = {
  draft:          { label: 'Draft',       color: 'var(--color-ink-600)' },
  pending_review: { label: 'In Review',   color: 'var(--color-amber-proof)' },
  published:      { label: 'Published',   color: 'var(--color-wire-teal)' },
  scheduled:      { label: 'Scheduled',   color: '#7c3aed' },
};

export default function StatusStamp({ status, scheduledAt }) {
  // If published but scheduledAt is in the future, show as Scheduled
  const isScheduled = status === 'published' && scheduledAt && new Date(scheduledAt) > new Date();
  const key = isScheduled ? 'scheduled' : status;
  const s = STYLES[key] || STYLES.draft;

  return (
    <span className="stamp" style={{ color: s.color }}>
      {isScheduled ? `⏰ ${s.label}` : s.label}
    </span>
  );
}
