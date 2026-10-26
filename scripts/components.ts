import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { componentReference, referenceFile } from "./component-reference.ts";

const root = process.cwd();
await writeFile(join(root, referenceFile), await componentReference(root));
console.log(`pnpm components: wrote ${referenceFile}`);
