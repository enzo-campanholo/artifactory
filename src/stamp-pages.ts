import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BuiltPage } from "./built-output.ts";

// A page is read again because the steps before a stamp may have rewritten it.
export async function stampPages(
  outDir: string,
  pages: BuiltPage[],
  placeholder: string | RegExp,
  stamp: (page: BuiltPage) => string,
): Promise<void> {
  await Promise.all(
    pages.map(async (page) => {
      const html = await readFile(join(outDir, page.file), "utf8");
      const stamped = html.replace(placeholder, () => stamp(page));
      if (stamped !== html) await writeFile(join(outDir, page.file), stamped);
    }),
  );
}
