'use server'
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm' // support for GitHub Flavored Markdown
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeSlug from 'rehype-slug'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { wrap } from 'module';

interface CustomCodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children: string | string[];
  [key: string]: unknown; // Allow other props
}

function rangeParser(ranges: string): number[] {
  const result: number[] = [];
  ranges.split(',').forEach((range) => {
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(Number);
      for (let i = start; i <= end; i++) {
        result.push(i);
      }
    } else {
      const num = Number(range);
      if (!isNaN(num)) {
        result.push(num);
      }
    }
  });
  return result;
}

// map langs that have no builtin renderer
function mapLang(hasLang: string[] | null): string {
  let language = hasLang ? hasLang[1].toLowerCase() : 'text';
  // map langs that have no builtin renderer
  if (language === 'sh' || language === 'shell' || language === 'fish') {
    language = 'bash';
  }
  return language;
}

export default async function BlogMarkdown({ markdown }: { markdown: string }) {
  const syntaxTheme = oneDark;

  const MarkdownComponents: object = {
    code({ node, inline, className, children }: CustomCodeProps) {
      const hasLang = /language-(\w+)/.exec(className || '');
      const metaString = node?.data?.meta as string | undefined; // e.g., "```c hightlight={1,3-5}"
      const language = mapLang(hasLang)

      let highlightLines: number[] = [];
      // Only wrap lines if metaString (for highlighting) is present
      let wrapLines = false;
      if (metaString) {
        wrapLines = true;
        // Try to find highlight={...} first, then fallback to {...} for backward compatibility
        const highlightMatch = metaString.match(/highlight=\{([\d\s,-]+)\}/) || metaString.match(/\{([\d\s,-]+)\}/);
        if (highlightMatch) {
          highlightLines = rangeParser(highlightMatch[1].replace(/\s/g, ''));
        }
      }

      const applyHighlights = (lineNumber: number) => {
        if (highlightLines.includes(lineNumber)) {
          return { style: { backgroundColor: 'rgba(255, 255, 255, 0.1)' } };
        }
        return {};
      };

      // Convert children to string and remove a potential trailing newline
      const codeString = String(children).replace(/\n$/, '');

      if (inline) {
        // Handle inline code (e.g., `code`)
        return <code className={className}>{children}</code>;
      }

      return hasLang ? (
        <SyntaxHighlighter
          style={syntaxTheme}
          language={language}
          useInlineStyles={true}
          className={className}
          showLineNumbers={true}
          wrapLines={wrapLines}
          wrapLongLines={true}
          lineProps={applyHighlights}
        >
          {codeString}
        </SyntaxHighlighter>
      ) : (
        <code className={className}>
          {codeString}
        </code>
      );
    },
  }

  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSlug, rehypeAutolinkHeadings]}
      components={MarkdownComponents}
    >
      {markdown}
    </Markdown>
  )
}
