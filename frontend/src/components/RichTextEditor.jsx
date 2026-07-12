import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useCallback } from 'react';

// ── Auto-heading detection rules ──
// When author presses Enter after a line that looks like a heading,
// the previous line gets automatically converted to H2 or H3.
const AutoHeading = Extension.create({
  name: 'autoHeading',

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor;
        const { selection, doc } = state;
        const { $from } = selection;

        // Only act on paragraphs (not already headings/lists)
        if ($from.parent.type.name !== 'paragraph') return false;

        const lineText = $from.parent.textContent.trim();

        // Skip empty lines and very long lines
        if (!lineText || lineText.length > 80) return false;

        // ── Heading detection rules ──
        const rules = [
          // Ends with colon → H2 (e.g. "ಹಿನ್ನೆಲೆ:" or "Background:")
          { test: () => /[:：]$/.test(lineText), level: 2 },
          // Starts with number + dot/bracket (e.g. "1. ಮೊದಲ ಅಂಶ") → H3
          { test: () => /^[0-9]+[.)]\s/.test(lineText), level: 3 },
          // ALL CAPS English line → H2
          { test: () => /^[A-Z\s]{4,}$/.test(lineText), level: 2 },
          // Short line under 50 chars that doesn't end with sentence punctuation → H2
          {
            test: () =>
              lineText.length <= 50 &&
              !/[.!?।,]$/.test(lineText) &&
              lineText.split(' ').length <= 8,
            level: 2,
          },
        ];

        const match = rules.find(r => r.test());
        if (!match) return false;

        // Convert current paragraph to heading
        editor
          .chain()
          .setHeading({ level: match.level })
          .run();

        // Now insert a new paragraph after
        editor.chain().focus().insertContentAt(
          editor.state.selection.$to.pos,
          { type: 'paragraph' }
        ).run();

        return true;
      },
    };
  },
});

function ToolbarButton({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={`px-2 py-1.5 rounded text-sm transition-colors ${
        active ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-paper-100 hover:text-ink-900'
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-paper-200 mx-0.5 self-center" />;
}

export default function RichTextEditor({ content, onChange, disabled, placeholder }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        HTMLAttributes: { class: 'text-press-red underline' },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Write your story here… Short lines ending with ":" auto-become subheadings when you press Enter.',
      }),
      AutoHeading,
    ],
    content: content || '',
    editable: !disabled,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== undefined) {
      const current = editor.getHTML();
      if (current !== content && content !== null) {
        editor.commands.setContent(content || '', false);
      }
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [disabled, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL', prev || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const btn = (label, action, activeCheck, title) => (
    <ToolbarButton onClick={action} active={activeCheck} disabled={disabled} title={title || label}>
      {label}
    </ToolbarButton>
  );

  // Show what the current block type is
  const currentBlock = editor.isActive('heading', { level: 2 }) ? 'H2'
    : editor.isActive('heading', { level: 3 }) ? 'H3'
    : editor.isActive('bulletList') ? 'List'
    : editor.isActive('orderedList') ? 'Ordered'
    : editor.isActive('blockquote') ? 'Quote'
    : 'Normal';

  return (
    <div className={`border border-paper-200 rounded overflow-hidden ${disabled ? 'opacity-70' : ''}`}>
      {!disabled && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-paper-200 bg-paper-50">
          {/* Current block indicator */}
          <span className="text-xs font-mono bg-paper-100 border border-paper-200 rounded px-2 py-1 text-ink-500 mr-1">
            {currentBlock}
          </span>

          <Divider />

          {/* Text formatting */}
          {btn('B', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), 'Bold')}
          {btn('I', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), 'Italic')}
          {btn('U', () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'), 'Underline')}

          <Divider />

          {/* Headings */}
          {btn('H2', () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            editor.isActive('heading', { level: 2 }), 'Heading 2 — auto-detected on short lines ending with ":"')}
          {btn('H3', () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
            editor.isActive('heading', { level: 3 }), 'Heading 3')}

          <Divider />

          {/* Lists */}
          {btn('• List', () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), 'Bullet List')}
          {btn('1. List', () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), 'Numbered List')}

          <Divider />

          {/* Quote + HR */}
          {btn('" Quote', () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'), 'Blockquote — appears as pull quote on public site')}
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} disabled={disabled} title="Divider line">
            — Rule
          </ToolbarButton>

          <Divider />

          {/* Alignment */}
          {btn('≡ Left', () => editor.chain().focus().setTextAlign('left').run(), editor.isActive({ textAlign: 'left' }), 'Align Left')}
          {btn('≡ Center', () => editor.chain().focus().setTextAlign('center').run(), editor.isActive({ textAlign: 'center' }), 'Align Center')}

          <Divider />

          {/* Link */}
          <ToolbarButton onClick={setLink} active={editor.isActive('link')} disabled={disabled} title="Insert/edit link">
            🔗 Link
          </ToolbarButton>

          <Divider />

          {/* History */}
          {btn('↩', () => editor.chain().focus().undo().run(), false, 'Undo')}
          {btn('↪', () => editor.chain().focus().redo().run(), false, 'Redo')}
        </div>
      )}

      {/* Auto-format hint */}
      {!disabled && (
        <div className="px-3 py-1.5 bg-paper-50 border-b border-paper-100 text-xs text-ink-400 flex items-center gap-3">
          <span>✨ <strong>Auto-format:</strong></span>
          <span>End a line with <code className="bg-paper-100 px-1 rounded">:</code> → becomes H2 subheading</span>
          <span>·</span>
          <span>Short line (under 50 chars) → becomes H2</span>
          <span>·</span>
          <span>Start with <code className="bg-paper-100 px-1 rounded">1.</code> → becomes H3</span>
        </div>
      )}

      <EditorContent editor={editor} className="rich-editor" />
    </div>
  );
}
