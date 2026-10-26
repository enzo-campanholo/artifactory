export const seamFolders = ["tests/check", "tests/worker", "tests/store", "tests/scoring"];

// Fixture repos leave these out, and no test at the other seams reads them, so no Vitest result
// depends on them.
export const pathsUnreadByTests = ["artifacts/", ".scratch/", "docs/"];

export function isRunnableTest(file: string): boolean {
  return file.endsWith(".test.ts") && seamFolders.some((folder) => file.startsWith(`${folder}/`));
}
