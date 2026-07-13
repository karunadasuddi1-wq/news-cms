import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import RichTextEditor from '../components/RichTextEditor';
import TagInput from '../components/TagInput';
import ImageUpload from '../components/ImageUpload';

const labelCls = 'block text-xs font-mono uppercase tracking-wide text-ink-600 mb-1.5';
const inputCls = 'w-full px-3 py-2.5 border border-paper-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-ink-900';

function SectionEyebrow({ children }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 border-b border-ink-900/10 pb-1 mb-3">
      {children}
    </p>
  );
}

function Card({ children }) {
  return (
    <div className="bg-paper-50 border border-paper-200 rounded-lg p-5 mb-6">
      {children}
    </div>
  );
}

export default function GuestSubmit() {
  const { token } = useParams();

  const [categories, setCategories] = useState([]);
  const [submitterName, setSubmitterName] = useState('');
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    client.get('/public/categories')
      .then(res => setCategories(res.data.categories || []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!title.trim() || content.trim().length < 50) {
      setError('Please add a title and at least 50 characters of content.');
      return;
    }

    setSubmitting(true);
    try {
      await client.post('/public/guest-articles', {
        token,
        title,
        excerpt,
        content,
        featuredImage,
        categoryId: categoryId || undefined,
        tags,
        submitterName,
      });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong submitting your article. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <span
          className="stamp inline-block mb-6"
          style={{ color: 'var(--color-wire-teal)', borderColor: 'var(--color-wire-teal)' }}
        >
          Filed for Review
        </span>
        <h1 className="font-display font-bold text-3xl text-ink-900 mb-3">
          Thank you{submitterName ? `, ${submitterName.split(' ')[0]}` : ''}.
        </h1>
        <p className="text-ink-600 max-w-md mx-auto">
          Your story is in the queue. An editor will review it before it goes live — no further action needed on your end.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-10 pb-6 border-b-2 border-ink-900">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-400 mb-2">
          Contributor Desk
        </p>
        <h1 className="font-display font-bold text-4xl text-ink-900 leading-tight">
          Submit a Story
        </h1>
        <p className="text-ink-600 mt-2 text-sm">
          Every submission is reviewed by an editor before it's published — nothing goes live automatically.
        </p>
      </div>

      {error && (
        <div className="bg-press-red/10 border border-press-red/30 text-press-red text-sm rounded px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <SectionEyebrow>Byline</SectionEyebrow>
        <Card>
          <label className="block">
            <span className={labelCls}>Your name</span>
            <input value={submitterName} onChange={e => setSubmitterName(e.target.value)}
              className={inputCls} placeholder="e.g. Jane Freelancer" />
          </label>
        </Card>

        <SectionEyebrow>The Story</SectionEyebrow>
        <Card>
          <div className="space-y-5">
            <label className="block">
              <span className={labelCls}>Title</span>
              <input value={title} onChange={e => setTitle(e.target.value)}
                className={inputCls} placeholder="Article headline" required />
            </label>

            <label className="block">
              <span className={labelCls}>Category</span>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputCls}>
                <option value="">Let the editor choose</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            <label className="block">
              <span className={labelCls}>Excerpt / summary</span>
              <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)}
                className={inputCls} rows={2} placeholder="A short 1-2 sentence summary (optional)" />
            </label>

            <div className="block">
              <span className={labelCls}>Featured image</span>
              <div className="mb-2">
                <ImageUpload label="Upload from computer" onUpload={url => setFeaturedImage(url)} />
              </div>
              <input value={featuredImage} onChange={e => setFeaturedImage(e.target.value)}
                className={inputCls + ' font-mono text-sm'} placeholder="https://… or upload above" />
              {featuredImage && (
                <div className="mt-2 rounded overflow-hidden border border-paper-200 inline-block">
                  <img src={featuredImage} alt="Featured" className="h-24 object-cover" />
                </div>
              )}
            </div>

            <label className="block">
              <span className={labelCls}>Tags</span>
              <TagInput tags={tags} onChange={setTags} />
            </label>
          </div>
        </Card>

        <SectionEyebrow>Write</SectionEyebrow>
        <Card>
          <RichTextEditor content={content} onChange={setContent} />
        </Card>

        <button type="submit" disabled={submitting}
          className="w-full bg-press-red hover:bg-press-red-dark text-white text-sm font-semibold py-3.5 rounded transition-colors disabled:opacity-60">
          {submitting ? 'Submitting…' : 'Submit for Review'}
        </button>
      </form>
    </div>
  );
}
