import { plainText } from "./plain-text.ts";
import { readQuestions, type NumberedQuestion } from "./question-markers.ts";

export interface Heading {
  depth: number;
  slug: string;
  text: string;
}

export interface SectionHeading {
  slug: string;
  html: string;
  mathText: string | undefined;
}

export interface Section {
  heading: SectionHeading | undefined;
  questions: NumberedQuestion[];
}

// Code blocks escape their "<", so only a real h2 matches.
const sectionStart = /<h2\b[^>]*\sid="([^"]*)"[^>]*>([\s\S]*?)<\/h2>/g;
const link = /<\/?a\b(?:[^>"']|"[^"]*"|'[^']*')*>/g;

export const sectionsForContents = 3;

export function outline(content: string, headings: Heading[]): Section[] {
  const listed = new Set(headings.filter(({ depth }) => depth === 2).map(({ slug }) => slug));
  const starts = [...content.matchAll(sectionStart)].filter(({ 1: slug = "" }) => listed.has(slug));
  const parts = [
    { heading: undefined, html: content.slice(0, starts[0]?.index) },
    ...starts.map(({ 1: slug = "", 2: inner = "", index }, position) => {
      const html = inner.replace(link, "");
      return {
        heading: { slug, html, mathText: html.includes("<math") ? plainText(html) : undefined },
        html: content.slice(index, starts[position + 1]?.index),
      };
    }),
  ];
  let numberedBefore = 0;
  const sections = parts.map(({ heading, html }) => {
    const questions = readQuestions(html).map((question) => ({
      ...question,
      number: question.number + numberedBefore,
    }));
    numberedBefore += questions.length;
    return { heading, questions };
  });
  return sections.filter(({ heading, questions }) => heading !== undefined || questions.length > 0);
}
