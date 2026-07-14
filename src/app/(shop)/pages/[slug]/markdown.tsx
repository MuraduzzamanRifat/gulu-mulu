import * as React from 'react'
import Link from 'next/link'

/**
 * A deliberately tiny Markdown renderer for CMS `Page.content`.
 *
 * WHY HAND-ROLLED
 * ---------------
 * A policy page needs headings, emphasis, links, lists and the odd table. That is a few dozen lines
 * of parsing — not a reason to pull `remark` + `rehype` + a sanitiser (and their transitive tree)
 * into the bundle of a marketplace whose CMS content is written by our own admins.
 *
 * WHY IT CANNOT INJECT
 * --------------------
 * This renderer never touches `dangerouslySetInnerHTML`. It parses the source into React elements,
 * and every scrap of text that survives the parse is handed to React as a *text child*. React
 * escapes text children, so a `<script>alert(1)</script>` pasted into the CMS is displayed as the
 * literal characters `<script>alert(1)</script>` — it is never parsed as HTML. That is a stronger
 * guarantee than escaping into an HTML string, because there is no HTML string to get wrong.
 *
 * The one remaining injection surface in Markdown is the link target — `[x](javascript:…)` — so
 * `safeHref()` allowlists schemes and drops everything else back to plain text.
 *
 * SUPPORTED SUBSET (everything the seeded policy pages actually use, and nothing more)
 *   Block   : # / ## / ### headings, paragraphs, `* -  +` bullets, `1.` ordered lists,
 *             > blockquotes, ``` fenced code, --- rules, and GFM pipe tables (with alignment).
 *   Inline  : **bold**, *italic*, `code`, [text](href).
 *   Lists soft-wrap: a line indented by two spaces continues the item above it.
 *   Nested lists are flattened to one level — no seeded page nests, and one level of `<ul>` is all
 *   a policy page should need.
 */

/* -------------------------------------------------------------------------- */
/* Inline                                                                     */
/* -------------------------------------------------------------------------- */

/** `code` | [text](href) | **bold** | *italic* — first alternative to match wins, left to right. */
const INLINE_TOKEN = /`([^`\n]+)`|\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|\*([^*\n]+)\*/g

const SAFE_SCHEME = /^(?:https?:|mailto:|tel:)/i

/**
 * The only place a Markdown document can smuggle behaviour into the page. Same-origin paths and
 * fragments pass; http/https/mailto/tel pass; `javascript:`, `data:`, `vbscript:` and friends do
 * not — the link is rendered as its literal source text instead.
 */
function safeHref(raw: string): string | null {
  const href = raw.trim()
  if (!href) return null
  if (href.startsWith('/') || href.startsWith('#')) return href
  if (SAFE_SCHEME.test(href)) return href
  return null
}

const codeClass = 'rounded-md bg-surface-sunken px-1.5 py-0.5 font-mono text-[0.85em] text-ink'
const linkClass =
  'font-medium text-brand-600 underline underline-offset-2 transition-colors hover:text-brand-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xs'

function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  const isInternal = href.startsWith('/') || href.startsWith('#')

  if (isInternal) {
    return (
      <Link href={href} className={linkClass}>
        {children}
      </Link>
    )
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
    </a>
  )
}

/** Turn one line of text into React nodes. Plain strings are left as strings — React escapes them. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let cursor = 0
  let n = 0

  // A FRESH regex per invocation, never the shared module-level one.
  //
  // This function recurses (the body of `**bold**` is itself parsed for inline markup), and a /g
  // regex carries mutable `lastIndex` state on the OBJECT. Iterating the shared instance would let
  // the inner call rewind `lastIndex` out from under the outer loop, which then re-matches the same
  // token from the same position, forever — an infinite loop that allocates until the heap dies.
  // One regex per call, one `lastIndex` per call, no shared mutable state.
  const token = new RegExp(INLINE_TOKEN.source, 'g')
  let match: RegExpExecArray | null

  while ((match = token.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index))
    cursor = match.index + match[0].length

    const key = `${keyPrefix}i${n++}`
    const [raw, code, linkText, linkHref, bold, italic] = match

    if (code !== undefined) {
      nodes.push(
        <code key={key} className={codeClass}>
          {code}
        </code>,
      )
    } else if (linkText !== undefined && linkHref !== undefined) {
      const href = safeHref(linkHref)
      if (href) {
        nodes.push(
          <InlineLink key={key} href={href}>
            {renderInline(linkText, key)}
          </InlineLink>,
        )
      } else {
        // Unsafe scheme: show the author what they wrote, don't render a live link.
        nodes.push(raw)
      }
    } else if (bold !== undefined) {
      nodes.push(
        <strong key={key} className="font-semibold text-ink">
          {renderInline(bold, key)}
        </strong>,
      )
    } else if (italic !== undefined) {
      nodes.push(
        <em key={key} className="italic">
          {renderInline(italic, key)}
        </em>,
      )
    }
  }

  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

/* -------------------------------------------------------------------------- */
/* Block grammar                                                              */
/* -------------------------------------------------------------------------- */

const RE_HEADING = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/
const RE_RULE = /^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/
const RE_FENCE = /^ {0,3}```/
const RE_QUOTE = /^ {0,3}>\s?(.*)$/
const RE_UL = /^ {0,3}[*+-]\s+(.*)$/
const RE_OL = /^ {0,3}(\d{1,9})[.)]\s+(.*)$/
const RE_TABLE_ROW = /^ {0,3}\|/
const RE_TABLE_DIVIDER = /^ {0,3}\|?(?:\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?\s*$/

/** Does this line open a new block? Used to know where a paragraph stops. */
function startsBlock(line: string): boolean {
  return (
    line.trim() === '' ||
    RE_HEADING.test(line) ||
    RE_RULE.test(line) ||
    RE_FENCE.test(line) ||
    RE_QUOTE.test(line) ||
    RE_UL.test(line) ||
    RE_OL.test(line) ||
    RE_TABLE_ROW.test(line)
  )
}

type Align = 'left' | 'center' | 'right'

function splitRow(line: string): string[] {
  let row = line.trim()
  if (row.startsWith('|')) row = row.slice(1)
  if (row.endsWith('|')) row = row.slice(0, -1)
  return row.split('|').map((cell) => cell.trim())
}

function alignmentsOf(divider: string): Align[] {
  return splitRow(divider).map((cell) => {
    const left = cell.startsWith(':')
    const right = cell.endsWith(':')
    if (left && right) return 'center'
    if (right) return 'right'
    return 'left'
  })
}

const alignClass: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

/* -------------------------------------------------------------------------- */
/* Block rendering                                                            */
/* -------------------------------------------------------------------------- */

const headingClass: Record<number, string> = {
  2: 'mt-10 mb-3 scroll-mt-24 text-xl font-bold tracking-tight text-ink first:mt-0 sm:text-2xl',
  3: 'mt-8 mb-2.5 scroll-mt-24 text-lg font-semibold tracking-tight text-ink first:mt-0 sm:text-xl',
  4: 'mt-6 mb-2 scroll-mt-24 text-base font-semibold text-ink first:mt-0',
}

/**
 * The document title is already the page's `<h1>`, so content headings are clamped into h2–h4.
 * A lone `#` therefore becomes a section heading rather than a second `<h1>` — which keeps the
 * outline valid no matter how an admin writes the Markdown.
 */
function Heading({ level, children }: { level: number; children: React.ReactNode }) {
  const clamped = Math.min(4, Math.max(2, level))
  const Tag = `h${clamped}` as 'h2' | 'h3' | 'h4'
  return <Tag className={headingClass[clamped]}>{children}</Tag>
}

/** Parse `lines[start..]` into blocks, returning React nodes. Recursed into by blockquotes. */
function parseBlocks(lines: string[], keyPrefix: string): React.ReactNode[] {
  const blocks: React.ReactNode[] = []
  let i = 0
  let n = 0

  const nextKey = () => `${keyPrefix}b${n++}`

  while (i < lines.length) {
    const line = lines[i]

    // --- blank ---------------------------------------------------------------------------
    if (line.trim() === '') {
      i++
      continue
    }

    // --- fenced code ---------------------------------------------------------------------
    if (RE_FENCE.test(line)) {
      const code: string[] = []
      i++
      while (i < lines.length && !RE_FENCE.test(lines[i])) {
        code.push(lines[i])
        i++
      }
      i++ // consume the closing fence (or fall off the end — an unclosed fence still renders)
      blocks.push(
        <pre
          key={nextKey()}
          className="my-6 overflow-x-auto rounded-card border border-line bg-surface-sunken p-4 text-sm"
        >
          <code className="font-mono text-ink">{code.join('\n')}</code>
        </pre>,
      )
      continue
    }

    // --- heading -------------------------------------------------------------------------
    const heading = RE_HEADING.exec(line)
    if (heading) {
      const key = nextKey()
      blocks.push(
        <Heading key={key} level={heading[1].length}>
          {renderInline(heading[2], key)}
        </Heading>,
      )
      i++
      continue
    }

    // --- thematic break ------------------------------------------------------------------
    if (RE_RULE.test(line)) {
      blocks.push(<hr key={nextKey()} className="my-8 border-line" />)
      i++
      continue
    }

    // --- table ---------------------------------------------------------------------------
    // A pipe row is only a table when the NEXT line is the |---|---| divider. Otherwise it is
    // just a paragraph that happens to contain pipes.
    if (RE_TABLE_ROW.test(line) && i + 1 < lines.length && RE_TABLE_DIVIDER.test(lines[i + 1])) {
      const header = splitRow(line)
      const aligns = alignmentsOf(lines[i + 1])
      i += 2

      const rows: string[][] = []
      while (i < lines.length && RE_TABLE_ROW.test(lines[i])) {
        rows.push(splitRow(lines[i]))
        i++
      }

      const key = nextKey()
      blocks.push(
        // 375px cannot hold a four-column policy table, so the table scrolls inside its own box
        // and the page body never scrolls sideways.
        <div key={key} className="my-6 overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead className="bg-surface-sunken">
              <tr>
                {header.map((cell, c) => (
                  <th
                    key={c}
                    scope="col"
                    className={`px-4 py-3 font-semibold text-ink ${alignClass[aligns[c] ?? 'left']}`}
                  >
                    {renderInline(cell, `${key}h${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className="border-t border-line">
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className={`px-4 py-3 align-top text-ink-muted ${alignClass[aligns[c] ?? 'left']}`}
                    >
                      {renderInline(cell, `${key}r${r}c${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    // --- blockquote ----------------------------------------------------------------------
    if (RE_QUOTE.test(line)) {
      const quoted: string[] = []
      while (i < lines.length && RE_QUOTE.test(lines[i])) {
        quoted.push(RE_QUOTE.exec(lines[i])![1])
        i++
      }
      const key = nextKey()
      blocks.push(
        <blockquote
          key={key}
          className="my-6 border-l-4 border-brand-200 bg-brand-50/50 py-1 pl-4 text-ink-muted"
        >
          {parseBlocks(quoted, `${key}q`)}
        </blockquote>,
      )
      continue
    }

    // --- lists ---------------------------------------------------------------------------
    const ul = RE_UL.exec(line)
    const ol = RE_OL.exec(line)
    if (ul || ol) {
      const ordered = ol != null
      const start = ordered ? Number(ol![1]) : 1
      const items: string[] = []

      while (i < lines.length) {
        const current = lines[i]
        const asUl = RE_UL.exec(current)
        const asOl = RE_OL.exec(current)

        if (ordered ? asOl : asUl) {
          items.push((ordered ? asOl![2] : asUl![1]).trim())
          i++
          continue
        }

        // Soft-wrapped continuation: an indented, non-blank line that opens no new block belongs
        // to the item above it ("…so we can fix what is broken and show\n  you products…").
        if (items.length > 0 && /^\s{2,}\S/.test(current) && !asUl && !asOl) {
          items[items.length - 1] += ` ${current.trim()}`
          i++
          continue
        }

        break
      }

      const key = nextKey()
      const itemNodes = items.map((item, idx) => (
        <li key={idx} className="pl-1.5 marker:text-ink-subtle">
          {renderInline(item, `${key}l${idx}`)}
        </li>
      ))

      blocks.push(
        ordered ? (
          <ol
            key={key}
            start={start}
            className="my-5 list-decimal space-y-2 pl-5 text-ink-muted marker:font-semibold"
          >
            {itemNodes}
          </ol>
        ) : (
          <ul key={key} className="my-5 list-disc space-y-2 pl-5 text-ink-muted">
            {itemNodes}
          </ul>
        ),
      )
      continue
    }

    // --- paragraph -----------------------------------------------------------------------
    const paragraph: string[] = [line.trim()]
    i++
    while (i < lines.length && !startsBlock(lines[i])) {
      paragraph.push(lines[i].trim())
      i++
    }

    const key = nextKey()
    blocks.push(
      // Soft line breaks are spaces, exactly as Markdown says — the source is hard-wrapped at ~110
      // columns and must not render as ragged lines.
      <p key={key} className="my-4 leading-7 text-ink-muted">
        {renderInline(paragraph.join(' '), key)}
      </p>,
    )
  }

  return blocks
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export interface MarkdownProps {
  source: string
  className?: string
}

/** Render trusted CMS Markdown as React elements. Never emits raw HTML. */
export function Markdown({ source, className }: MarkdownProps) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  return <div className={className}>{parseBlocks(lines, 'md')}</div>
}

/**
 * A plain-text excerpt of the first real paragraph — used for `<meta name="description">` and for
 * the cards on /pages. Strips the markup rather than rendering it.
 */
export function markdownExcerpt(source: string, max = 155): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')

  const paragraph: string[] = []
  for (const line of lines) {
    if (paragraph.length === 0) {
      // Skip forward to the first line that opens a paragraph.
      if (line.trim() === '' || startsBlock(line)) continue
      paragraph.push(line.trim())
      continue
    }
    if (line.trim() === '' || startsBlock(line)) break
    paragraph.push(line.trim())
  }

  const text = paragraph
    .join(' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length <= max) return text

  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:—-]$/, '')}…`
}
