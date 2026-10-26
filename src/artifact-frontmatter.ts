import { z } from "astro/zod";

const draft = z.boolean("must be true or false").default(false);
const isPublic = z.boolean("must be true or false").default(false);
const draftAndPublic = z.object({ draft, public: isPublic });

export const artifactFrontmatter = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9]{8}$/, "must be 8 characters from a-z and 0-9"),
    title: z
      .string()
      .min(1, "must not be empty")
      .refine(
        (title) => !title.includes("`") && title.split("$").length < 3,
        "is plain text: write math in Unicode or words, and code without backticks",
      ),
    subject: z.string().min(1, "must not be empty"),
    lang: z.enum(["pt-BR", "en"], 'must be "pt-BR" or "en"'),
    published: z.date("must be a date written like 2026-10-15, without quotes"),
    draft,
    public: isPublic,
    formerSlugs: z.array(z.string(), "must be a list of slugs").optional(),
  })
  .refine((data) => !(data.draft && data.public), {
    path: ["public"],
    error: "can't be true on a draft: publish it first, or remove `public`",
    // Zod skips a refinement while any field fails. This one runs whenever `draft` and `public`
    // parse, so the refusal comes in the same run as the other fields' failures.
    when: ({ value }) => draftAndPublic.safeParse(value).success,
  });

export type ArtifactFrontmatter = z.output<typeof artifactFrontmatter>;
