// As Astro writes attribute values, so the page's frame reads an ID a component writes into its HTML
// the way it reads one Astro wrote.
export function escapedAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

export function unescapedAttribute(written: string): string {
  return written.replaceAll("&quot;", '"').replaceAll("&amp;", "&");
}
