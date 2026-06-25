import { useRef, useState } from 'react';

const CLOUD_NAME = 'dzext6inq';
const UPLOAD_PRESET = 'news-cms-uploads';

export default function ImageUpload({ onUpload, label = 'Upload image', disabled }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WebP, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB.');
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'news-cms');

      // Use XMLHttpRequest so we can track progress
      const url = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            // Request a web-optimised version: auto format, auto quality, max 1600px wide
            const optimised = data.secure_url.replace(
              '/upload/',
              '/upload/f_auto,q_auto,w_1600/'
            );
            resolve(optimised);
          } else {
            reject(new Error('Upload failed. Try again.'));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload.'));
        xhr.send(formData);
      });

      setProgress(100);
      onUpload(url);
    } catch (err) {
      setError(err.message || 'Upload failed. Try again.');
      setPreview('');
    } finally {
      setUploading(false);
      // Reset file input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        disabled={disabled || uploading}
      />

      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-paper-200 rounded bg-white hover:bg-paper-50 transition-colors disabled:opacity-50 text-ink-700"
      >
        {uploading ? (
          <>
            <span className="inline-block w-3.5 h-3.5 border-2 border-ink-300 border-t-ink-700 rounded-full animate-spin" />
            Uploading {progress}%…
          </>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {label}
          </>
        )}
      </button>

      {uploading && (
        <div className="mt-2 w-full bg-paper-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{ width: `${progress}%`, background: '#b23a2e' }}
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-press-red mt-1">{error}</p>
      )}

      {preview && !uploading && (
        <div className="mt-2 relative inline-block">
          <img src={preview} alt="Preview" className="h-16 w-24 object-cover rounded border border-paper-200" />
          <span className="absolute -top-1 -right-1 bg-wire-teal text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">✓</span>
        </div>
      )}
    </div>
  );
}
