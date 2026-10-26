// Intl's medium style writes "14 de out. de 2026" in Portuguese; the masthead and the attempts
// history write "14 out. 2026" in both languages' order.
export function shortDate(
  date: Date,
  lang: string,
  { withTime = false, timeZone }: { withTime?: boolean; timeZone?: string } = {},
): string {
  const parts = new Intl.DateTimeFormat(lang.startsWith("pt") ? "pt-BR" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : {}),
    timeZone,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  const day = `${part("day")} ${part("month")} ${part("year")}`;
  return withTime ? `${day}, ${part("hour")}:${part("minute")}` : day;
}
