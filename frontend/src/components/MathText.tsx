import katex from "katex";
import "katex/dist/katex.min.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type Segment =
  | { type: "text"; content: string }
  | { type: "display"; content: string }   // $$...$$
  | { type: "inline"; content: string };   // $...$

// ── Parser ────────────────────────────────────────────────────────────────────

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];

  // Split on $$...$$ first (display math)
  const blockParts = text.split(/(\$\$[\s\S]*?\$\$)/);

  for (const part of blockParts) {
    if (part.startsWith("$$") && part.endsWith("$$") && part.length > 4) {
      segments.push({ type: "display", content: part.slice(2, -2).trim() });
      continue;
    }
    // Split remaining text on $...$ (inline math, no newlines allowed inside)
    const inlineParts = part.split(/(\$[^$\n]+?\$)/);
    for (const inline of inlineParts) {
      if (inline.startsWith("$") && inline.endsWith("$") && inline.length > 2) {
        segments.push({ type: "inline", content: inline.slice(1, -1) });
      } else if (inline) {
        segments.push({ type: "text", content: inline });
      }
    }
  }

  return segments;
}

function renderMath(math: string, displayMode: boolean): string {
  try {
    return katex.renderToString(math, {
      displayMode,
      throwOnError: false,
      output: "htmlAndMathml",
    });
  } catch {
    // Render raw expression as fallback (e.g., malformed LaTeX)
    return `<span class="math-error">${math}</span>`;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface MathTextProps {
  children: string;
  className?: string;
  /** HTML tag to use as the container. Defaults to "span" for inline use. */
  as?: "p" | "span" | "div";
}

/**
 * Renders a string that may contain LaTeX math expressions.
 * Supports $$...$$ (display/block) and $...$ (inline) notation.
 * Plain text is rendered as-is with no overhead.
 */
export default function MathText({ children, className, as: Tag = "span" }: MathTextProps) {
  const segments = parseSegments(children);

  // Fast path: no math markers — avoid extra spans
  if (segments.length === 1 && segments[0].type === "text") {
    return <Tag className={className}>{segments[0].content}</Tag>;
  }

  return (
    <Tag className={className}>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <span key={i}>{seg.content}</span>;
        }
        return (
          <span
            key={i}
            // KaTeX output is trusted; content comes from our own AI backend
            dangerouslySetInnerHTML={{ __html: renderMath(seg.content, seg.type === "display") }}
            aria-label={seg.content}
          />
        );
      })}
    </Tag>
  );
}
