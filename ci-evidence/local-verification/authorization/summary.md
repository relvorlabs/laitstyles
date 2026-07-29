## authorization

**Result:** failed

| Gate | Required | Result | Duration |
| --- | --- | --- | ---: |
| auth-preflight | yes | failed | 13.9s |

### Diagnostics

<details><summary>❌ auth-preflight</summary>

```text
[WARN] Unsupported engine: wanted: {"node":"25.x"} (current: {"node":"v26.5.0","pnpm":"11.13.0"})
$ tsx scripts/auth/setup-local-auth.mjs
file:///C:/Users/olaitan/Dev/laitstyles/scripts/auth/setup-local-auth.mjs:23
  throw new Error(
        ^

Error: Pre-provisioned auth test environment is incomplete: missing DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY
    at file:///C:/Users/olaitan/Dev/laitstyles/scripts/auth/setup-local-auth.mjs:23:9
    at ModuleJob.run (node:internal/modules/esm/module_job:569:25)
    at async node:internal/modules/esm/loader:650:26
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5)

Node.js v26.5.0
[ELIFECYCLE] Command failed with exit code 1.

```
</details>
