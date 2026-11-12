export function partOf(host: Element, selector: string): HTMLElement {
  const part = host.querySelector<HTMLElement>(selector);
  if (part === null) throw new Error(`${host.localName} has no ${selector}`);
  return part;
}
