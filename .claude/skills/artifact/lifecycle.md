# Make public, make private, rename, delete

Each ends with the shared steps under [Finishing](SKILL.md#finishing).

## Make public

1. Set `public: true` in the frontmatter. If the artifact is a draft, publish it in the same change, as in [Publish a draft](SKILL.md#publish-a-draft).
2. Finish: check, publish, watch CI, reply. The reply gives the URL and says that anyone with the link can open it once CI is green, that search engines don't list it, and that the Library marks it "Public"; if it was a draft, say you published it.

## Make private

1. Remove the `public` line.
2. Finish: check, publish, watch CI, reply. The reply says that anyone with the link now meets the owner's sign-in.

## Rename

1. `pnpm rename <old-slug> <new-slug>`. It moves the folder, records the old slug as a former slug in `formerSlugs` and rewrites links to it in other artifacts, then prints what it did. It refuses a new slug that breaks [Slugs](rules.md#slugs). Renaming back to a former slug is fine: `pnpm rename` takes it off the list. `formerSlugs` is `pnpm rename`'s alone, and the build turns each former slug into a permanent redirect, so there's no `_redirects` file to edit. A public artifact's former slugs stay open while it's public, so a link the owner sent before the rename still works.
2. Finish: check, publish, watch CI, reply with the new URL.

## Delete

1. `git rm -r artifacts/<slug>/`.
2. Run `pnpm check`. Every link to the deleted artifact fails as `link` ("leads to no page"). Reword each of those passages so it reads well without the link, and check again.
3. Finish: publish, watch CI, and reply that the artifact is gone. The owner's answers stay stored, and restoring the folder from git brings them back.
