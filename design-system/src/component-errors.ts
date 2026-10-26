// A component's own error reaches the check without a location, only as its message. The check
// reads the component names back from the start of the message to place the error at their tag.

const namesPrefix = /^(?<names>[A-Z]\w*(?: or [A-Z]\w*)*): /;

export function componentError(name: string | readonly string[], message: string): Error {
  const names = typeof name === "string" ? [name] : name;
  return new Error(`${names.join(" or ")}: ${message}`);
}

export function componentNamesIn(message: string): string[] {
  return namesPrefix.exec(message)?.groups?.names?.split(" or ") ?? [];
}
