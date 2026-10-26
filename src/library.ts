import { getCollection } from "astro:content";

const titleOrder = new Intl.Collator("pt-BR");

export async function listedArtifacts({ drafts }: { drafts: boolean }) {
  const entries = await getCollection("artifacts", ({ data }) => data.draft === drafts);
  return entries
    .map(({ id: slug, data: { id, title, subject, lang, published, public: isPublic } }) => ({
      id,
      href: `/${slug}/`,
      title,
      subject,
      lang,
      published,
      public: isPublic,
    }))
    .sort(
      (a, b) =>
        b.published.getTime() - a.published.getTime() || titleOrder.compare(a.title, b.title),
    );
}
