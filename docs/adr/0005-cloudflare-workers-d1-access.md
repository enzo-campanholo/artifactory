# Cloudflare Workers, D1 and Access for hosting

The platform runs on Cloudflare. One Worker serves the static site and the state API from a single origin, artifact state lives in D1, and Cloudflare Access is the login in front of everything except public artifacts. The code lives on GitHub, and GitHub Actions deploys it.

We chose this over Vercel Hobby with Upstash or Neon, and over self-hosting on the owner's laptop through Tailscale Serve:

- **One provider for everything.** Site, API, store and login share one account and one origin, so the state API inherits the login.
- **The database enforces the state rules.** A unique key on (attempt, question) makes "first saved answer wins" hold atomically. The Library's summary of every artifact is one query.
- **Free-tier record.** Cloudflare's free tier is the most stable on the shortlist: Workers' limits have been unchanged since 2019 and Zero Trust's since 2020. At a limit, requests fail rather than bill.
- **Vercel** would put state with a second provider. Its free production login only arrived in 2026-09, and going over a Hobby limit locks the feature for 30 days.
- **Self-hosting** needs Tailscale on every device and depends on one laptop's uptime. It also hands agents backups and NixOS upkeep.

GitHub is the git host because Claude Code cloud sessions can only push to GitHub.

## Consequences

- The free Zero Trust plan requires payment details on file, though Cloudflare doesn't charge the free plan. This is the one exception to "spend nothing" without a card.
- The Worker and D1 bindings are Cloudflare APIs, so moving away means rewriting the state API. The data itself is plain SQLite, and Access needs no app code.
- D1 restores only the last 7 days on the free plan. A weekly export guards against losses noticed later than that.
- Public artifacts and the paths they need are left open by an Access Bypass, while `/api/*` stays protected. Access itself keeps visitors away from D1, the Worker needs no visitor logic, and a visitor's page loads are free static asset requests. A visitor's answers are throwaway state and never reach the server.
- The bypass also opens every hashed file under `/_astro/`, so a private artifact's images and scripts can be fetched by anyone who knows their URL. The names can't be guessed and nothing links to them; keeping them apart would take a second build. CI is to keep the bypass in step with the artifacts' frontmatter and delete it when nothing is public (`.scratch/public-artifacts/`); until then, nothing is open.
