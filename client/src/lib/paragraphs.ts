// Long texts (bio, descriptions) come as plain text with blank lines between paragraphs; they
// are rendered as separate <p> elements, never as HTML.
export function toParagraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '');
}
