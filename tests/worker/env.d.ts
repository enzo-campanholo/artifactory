declare namespace Cloudflare {
  interface Env {
    TEST_ACCESS_KEYS: string;
    TEST_UNPUBLISHED_ACCESS_KEYS: string;
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
  }

  interface GlobalProps {
    mainModule: typeof import("../../worker/index.ts");
  }
}
