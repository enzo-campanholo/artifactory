import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

// The deployed site as a visitor with no cookies meets it: what each path answers, and Access's
// redirect to its login for every path not listed. A path given several answers gives them in
// turn, then keeps giving the last.
export interface SiteAnswer {
  status: number;
  location?: string;
  noindex?: boolean;
  body?: string;
}

export interface SiteStandIn {
  url: string;
  answers: Record<string, SiteAnswer | SiteAnswer[]>;
  requests: string[];
  close(): Promise<void>;
}

// The form Access's login redirect takes for a self-hosted app.
export function accessLogin(path: string): SiteAnswer {
  return {
    status: 302,
    location: `https://estudos.cloudflareaccess.com/cdn-cgi/access/login/estudos.example.org?kid=protected-app-aud&redirect_url=${encodeURIComponent(path)}`,
  };
}

export async function startSiteStandIn(): Promise<SiteStandIn> {
  const standIn = { answers: {}, requests: [] as string[] } as Pick<
    SiteStandIn,
    "answers" | "requests"
  >;
  const server = createServer((request, response) => {
    const path = request.url ?? "/";
    const asked = standIn.requests.filter((earlier) => earlier === path).length;
    standIn.requests.push(path);
    const listed = standIn.answers[path] ?? accessLogin(path);
    const answers = Array.isArray(listed) ? listed : [listed];
    const answer = answers[Math.min(asked, answers.length - 1)] ?? accessLogin(path);
    response.writeHead(answer.status, {
      ...(answer.location === undefined ? {} : { Location: answer.location }),
      ...(answer.noindex === true ? { "X-Robots-Tag": "noindex" } : {}),
    });
    response.end(answer.body ?? "");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return Object.assign(standIn, {
    url: `http://127.0.0.1:${String(port)}`,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      }),
  });
}
