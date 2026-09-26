// Heading text -> anchor id, the way rehype-slug (github-slugger) builds the ids
// on the rendered headings, so the contents list links match them. The old
// version kept only ASCII word characters, which erased every Arabic letter.
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\s-]/gu, "")
    .replace(/ /g, "-");
}
