import { useEffect, useRef } from 'react';

// AdSense slot component
// Replace data-ad-client and data-ad-slot with your actual AdSense values
const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || 'ca-pub-XXXXXXXXXXXXXXXXX';

export function AdBanner({ slot, format = 'auto', className = '' }) {
  const ref = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    if (!ADSENSE_CLIENT || ADSENSE_CLIENT.includes('XXXX')) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {}
  }, []);

  // Show placeholder in dev/when no AdSense client set
  if (!ADSENSE_CLIENT || ADSENSE_CLIENT.includes('XXXX')) {
    return (
      <div className={`ad-placeholder ${className}`} style={{
        background: '#f5f5f5',
        border: '1px dashed #ddd',
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#bbb',
        fontSize: 11,
        fontFamily: 'Inter, sans-serif',
        gap: 4,
      }}>
        <span style={{ fontSize: 18 }}>📢</span>
        <span>Advertisement</span>
        <span style={{ fontSize: 10 }}>{slot}</span>
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

// Leaderboard — 728x90, shown below header on desktop
export function LeaderboardAd() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      padding: '8px 0',
      background: '#fafaf8',
      borderBottom: '1px solid #eee',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 728 }}>
        <div style={{ fontSize: 9, color: '#bbb', fontFamily: 'Inter, sans-serif', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Advertisement</div>
        <AdBanner
          slot={import.meta.env.VITE_AD_SLOT_LEADERBOARD || 'LEADERBOARD'}
          format="horizontal"
          className=""
        />
      </div>
    </div>
  );
}

// Rectangle — 300x250, used in sidebar
export function SidebarAd() {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #eee',
      borderRadius: 4,
      padding: '8px 8px 4px',
      marginBottom: 16,
    }}>
      <div style={{ fontSize: 9, color: '#bbb', fontFamily: 'Inter, sans-serif', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Advertisement</div>
      <AdBanner
        slot={import.meta.env.VITE_AD_SLOT_SIDEBAR || 'SIDEBAR_RECT'}
        format="rectangle"
        className=""
        style={{ width: 300, height: 250 }}
      />
    </div>
  );
}

// In-article — shown after 3rd paragraph in article body
// Non-intrusive: same width as content, clearly labeled
export function InArticleAd() {
  return (
    <div style={{
      margin: '24px 0',
      padding: '8px 0',
      borderTop: '1px solid #f0ede8',
      borderBottom: '1px solid #f0ede8',
    }}>
      <div style={{ fontSize: 9, color: '#bbb', fontFamily: 'Inter, sans-serif', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Advertisement</div>
      <AdBanner
        slot={import.meta.env.VITE_AD_SLOT_IN_ARTICLE || 'IN_ARTICLE'}
        format="fluid"
        className=""
      />
    </div>
  );
}

// In-feed — between article sections on homepage
// Blends with content, clearly labeled
export function InFeedAd() {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #eee',
      borderRadius: 4,
      padding: '8px 12px',
      margin: '12px 0',
    }}>
      <div style={{ fontSize: 9, color: '#bbb', fontFamily: 'Inter, sans-serif', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Advertisement</div>
      <AdBanner
        slot={import.meta.env.VITE_AD_SLOT_IN_FEED || 'IN_FEED'}
        format="fluid"
      />
    </div>
  );
}
