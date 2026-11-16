import { isValidElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';
import { getTerm } from '../content/glossary';

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

export function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };
  return (
    <div className="code">
      {lang && <span className="code-lang">{lang}</span>}
      <button className="code-copy" onClick={copy} title="Nusxa olish" aria-label="Nusxa olish">
        {copied ? <Check /> : <Copy />}
      </button>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** A glossary term inside lesson text: click opens a small definition card. */
function GlossaryLink({ id, children }: { id: string; children: ReactNode }) {
  const term = getTerm(id);
  const ref = useRef<HTMLAnchorElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    // Deferred so the click that opened the card does not close it.
    const timer = setTimeout(() => window.addEventListener('click', close), 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', close);
    };
  }, [pos]);

  if (!term) return <>{children}</>;

  const open = (e: React.MouseEvent) => {
    e.preventDefault();
    if (pos) return setPos(null);
    const rect = ref.current!.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 24);
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    const below = rect.bottom + 8;
    // Flip above the word when there is no room below.
    const top = below + 150 > window.innerHeight ? Math.max(12, rect.top - 158) : below;
    setPos({ left, top });
  };

  return (
    <>
      <a ref={ref} href={`#g:${id}`} className="gterm" onClick={open}>
        {children}
      </a>
      {pos &&
        createPortal(
          <div className="popover" style={pos} role="tooltip" onClick={(e) => e.stopPropagation()}>
            <strong>
              {term.term}
              {term.uz && <span>{term.uz}</span>}
            </strong>
            {term.text}
          </div>,
          document.body,
        )}
    </>
  );
}

const components: Components = {
  a({ href, children }) {
    if (href?.startsWith('#g:')) return <GlossaryLink id={href.slice(3)}>{children}</GlossaryLink>;
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  },
  pre({ children }) {
    const child = Array.isArray(children) ? children[0] : children;
    const className = isValidElement<{ className?: string }>(child) ? (child.props.className ?? '') : '';
    const lang = /language-(\w+)/.exec(className)?.[1];
    return <CodeBlock code={textOf(children).replace(/\n$/, '')} lang={lang} />;
  },
  table({ children }) {
    return (
      <div className="table-wrap">
        <table>{children}</table>
      </div>
    );
  },
};

export function Markdown({ text, className = 'prose' }: { text: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
