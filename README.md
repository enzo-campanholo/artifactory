<img src="assets/icon.svg" width="64" height="64" alt="">

# artifactory

A self-hosted platform where coding agents build interactive study artifacts from a shared design system, and one owner studies with them from any device.

You hand an agent (Claude Code or Codex) your notes, slides or a topic. It writes an artifact: numbered prose, math, code, diagrams, step-through walkthroughs and questions, all drawn by the design system. A check gates it, and the agent publishes it straight to your site. Your answers are saved per attempt, so the Library shows where you stopped and what to revisit.

## How it works

- **Artifacts:** each one is an MDX entry in `artifacts/<slug>/`, holding content and data, plus behaviour only inside a design system `Stage`. Agents create, revise and publish them with the `artifact` skill in `.claude/skills/artifact/`.
- **Site:** Astro builds every artifact, the Library, the drafts page and the design system's catalog into static pages. Math is rendered with Temml, code with Shiki and diagrams with D2. The build moves an artifact page's scripts into its `<head>` with `blocking="render"`, so in Chromium its first frame already shows the answers this device last showed.
- **Design system:** `design-system/` is the `@artifactory/design-system` package. Artifacts import only its components, listed in `design-system/COMPONENTS.md`.
- **State:** a Cloudflare Worker serves the pages and the state API, which stores answers in D1. Cloudflare Access keeps the site private to the owner.
- **Gate:** `pnpm check` builds the site and runs every check: the artifact rules, types, lint, HTML validation, formatting, dead code and the tests. CI runs it on every push and deploys `main` when it passes.

The decisions behind this are in `docs/adr/`, and `GLOSSARY.md` defines the vocabulary.

## Development

Node 22 and pnpm. On NixOS, `nix develop` provides both.

```bash
pnpm install
pnpm dev          # the site at http://localhost:4321, with throwaway state
pnpm dev:worker   # the built site behind the Worker, a local D1 and an Access stand-in
pnpm check        # the full gate, as CI runs it (about five minutes)
```

`pnpm dev:worker` serves the site at http://localhost:8788, through the Access stand-in, with `wrangler dev` on 8787. With `DEV_WORKER_PORT` set, `wrangler dev` takes that port and the stand-in the next one, so a second checkout's `DEV_WORKER_PORT=8797 pnpm dev:worker` runs beside the first.

To start an artifact by hand, `pnpm new <slug> --subject "<Subject>" --lang <pt-BR|en>`, then follow the `artifact` skill. `CODING_STANDARDS.md` covers changes to the platform and the design system.

## Deploying your own

The site runs on Cloudflare's free plans, deployed by GitHub Actions.

1. Create a D1 database named `artifactory` (`pnpm exec wrangler login`, then `pnpm exec wrangler d1 create artifactory`) and note its ID.
2. Add your domain to Cloudflare. In Zero Trust (the free plan asks for a payment method but doesn't charge), choose a team name: your team domain is `https://<team>.cloudflareaccess.com`. Create a self-hosted Access application covering the hostname you'll serve the site on, with a policy that lets only you in, and note its audience (AUD) tag.
3. Create an API token from the "Edit Cloudflare Workers" template, with Account › D1 › Edit added.
4. In the GitHub repository's Actions settings, add the secret `CLOUDFLARE_API_TOKEN` and these variables:

   | Variable                | Value                                          |
   | ----------------------- | ---------------------------------------------- |
   | `CLOUDFLARE_ACCOUNT_ID` | your Cloudflare account ID                     |
   | `ARTIFACTORY_DOMAIN`    | the hostname, such as `artifactory.example.com` |
   | `D1_DATABASE_ID`        | the D1 database ID                             |
   | `ACCESS_TEAM_DOMAIN`    | `https://<team>.cloudflareaccess.com`          |
   | `ACCESS_AUD`            | the Access application's AUD tag               |

5. Push to `main`. Until `ARTIFACTORY_DOMAIN` is set, CI only checks. Once it is, CI fills these values into `wrangler.jsonc` (`scripts/deploy-config.ts`), applies the D1 migrations in `migrations/` and runs `wrangler deploy`.

A weekly workflow exports D1 and keeps each dump for 90 days, since the free plan restores only the last 7.

## License

[0BSD](LICENSE).
