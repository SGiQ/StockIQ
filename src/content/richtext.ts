/**
 * The RichText parser.
 *
 * Exactly three constructs are legal, and anything resembling other markup
 * is a hard error. Keeping the grammar this small means the renderer is
 * total (every parse produces something drawable) and no sanitization step
 * is ever needed.
 *
 *   **bold**
 *   [[1]]                         a fill_blank slot
 *   {{trader:buffett|Buffett}}    a cross-link; display text after | is optional
 *
 * Shared by the app renderer and scripts/validate-content.ts, so it must
 * stay free of React and Node imports.
 */
import type { EntityRef } from './schema';

export type RichNode =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'blank'; slot: number }
  | { kind: 'link'; ref: EntityRef; text: string };

export interface RichParseResult {
  nodes: RichNode[];
  /** Slot numbers found, in order of appearance. */
  blanks: number[];
  refs: EntityRef[];
  errors: string[];
}

const TOKEN = /\*\*(.+?)\*\*|\[\[(\d+)\]\]|\{\{([^}|]+)(?:\|([^}]*))?\}\}/g;

/** Characters that suggest the author reached for markup we do not support. */
const SUSPECT = [
  { pattern: /<[a-zA-Z/][^>]*>/, message: 'HTML tags are not allowed in RichText' },
  { pattern: /^\s*[#]{1,6}\s/m, message: 'Markdown headings are not allowed in RichText' },
  { pattern: /!\[[^\]]*\]\([^)]*\)/, message: 'Markdown images are not allowed — use an ArtSpec' },
  {
    pattern: /(^|[^!])\[[^\[\]]+\]\([^)]*\)/,
    message: 'Markdown links are not allowed — use {{trader:id|Label}}',
  },
  { pattern: /(^|[^*])\*(?!\*)[^*\n]+\*(?!\*)/, message: 'Single-asterisk italics are not supported — use **bold**' },
  { pattern: /`/, message: 'Backticks are not supported in RichText' },
  { pattern: /_{2,}/, message: 'Underscore emphasis is not supported — use **bold**' },
];

const ENTITY_REF =
  /^(?:(?:trader|strategy|book|term):[a-z0-9]+(?:-[a-z0-9]+)*|lesson:[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*)$/;

export function parseRichText(input: string): RichParseResult {
  const nodes: RichNode[] = [];
  const blanks: number[] = [];
  const refs: EntityRef[] = [];
  const errors: string[] = [];

  for (const { pattern, message } of SUSPECT) {
    if (pattern.test(input)) errors.push(message);
  }

  // An odd number of ** delimiters means an unterminated bold run.
  const starRuns = input.match(/\*\*/g);
  if (starRuns && starRuns.length % 2 !== 0) {
    errors.push('unbalanced ** in RichText');
  }

  let cursor = 0;
  TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN.exec(input)) !== null) {
    if (match.index > cursor) {
      nodes.push({ kind: 'text', text: input.slice(cursor, match.index) });
    }

    const [, boldText, blankSlot, refBody, linkLabel] = match;

    if (boldText !== undefined) {
      nodes.push({ kind: 'bold', text: boldText });
    } else if (blankSlot !== undefined) {
      const slot = Number(blankSlot);
      blanks.push(slot);
      nodes.push({ kind: 'blank', slot });
    } else if (refBody !== undefined) {
      const ref = refBody.trim();
      if (!ENTITY_REF.test(ref)) {
        errors.push(`malformed cross-link "{{${refBody}}}" — expected {{trader:id|Label}}`);
        nodes.push({ kind: 'text', text: linkLabel?.trim() || ref });
      } else {
        const typed = ref as EntityRef;
        refs.push(typed);
        nodes.push({
          kind: 'link',
          ref: typed,
          text: linkLabel?.trim() || defaultLabelFor(typed),
        });
      }
    }

    cursor = match.index + match[0].length;
  }

  if (cursor < input.length) {
    nodes.push({ kind: 'text', text: input.slice(cursor) });
  }

  return { nodes, blanks, refs, errors };
}

/** "trader:paul-tudor-jones" -> "Paul Tudor Jones" when no label is given. */
function defaultLabelFor(ref: EntityRef): string {
  const id = ref.slice(ref.indexOf(':') + 1);
  const last = id.includes('/') ? id.slice(id.indexOf('/') + 1) : id;
  return last
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Plain-text projection — used for word counts and for ASK card context. */
export function toPlainText(input: string): string {
  return parseRichText(input)
    .nodes.map((n) => {
      switch (n.kind) {
        case 'text':
        case 'bold':
          return n.text;
        case 'link':
          return n.text;
        case 'blank':
          return '____';
      }
    })
    .join('');
}

export function countWords(input: string): number {
  const plain = toPlainText(input).trim();
  return plain.length === 0 ? 0 : plain.split(/\s+/).length;
}
