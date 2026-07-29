## persistence

**Result:** failed

| Gate | Required | Result | Duration |
| --- | --- | --- | ---: |
| persistence-preflight | yes | failed | 13.7s |

### Diagnostics

<details><summary>❌ persistence-preflight</summary>

```text
[WARN] Unsupported engine: wanted: {"node":"25.x"} (current: {"node":"v26.5.0","pnpm":"11.13.0"})
$ tsx scripts/checks/phase-1-6-persistence.ts "--" "--preflight"
Refusing non-disposable database: acceptance marker is not set
[ELIFECYCLE] Command failed with exit code 1.

```
</details>
