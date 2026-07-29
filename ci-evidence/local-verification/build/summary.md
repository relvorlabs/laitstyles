## build

**Result:** passed-with-warnings

| Gate | Required | Result | Duration |
| --- | --- | --- | ---: |
| prisma-migrate-deploy | yes | passed | 46.7s |
| production-build | yes | passed | 583.2s |
| react-doctor | advisory | warning | 351.3s |

### Diagnostics

<details><summary>⚠️ react-doctor</summary>

```text
    Handing data back to a parent from a useEffect costs your
    users an extra render.
[2m    → Fetch the data in the parent and pass it down as a prop[22m
[2m    (or return it from the hook), instead of handing it back up[22m
[2m    through a prop callback in a useEffect. See[22m
[2m    https://react.dev/learn/you-might-not-need-an-effect#passing-data-to-the-parent[22m
[90m    Curl with no cache & follow the canonical fix and false positive check recipe before fixing: https://react.doctor/docs/rules/react-doctor/no-pass-data-to-parent[39m

[90m    src/modules/products/ui/admin/product-editor/product-editor-dialog.tsx:131[39m

  [33m⚠[39m [33mBugs: Array index used as a key[39m
    Your users can see & submit the wrong data when this list
    reorders or filters, so use a stable id like
    `key={item.id}`, not the array index "index".
[2m    → Use a stable id from the item, like `key={item.id}` or[22m
[2m    `key={item.slug}`. Index keys break when the list reorders[22m
[2m    or filters.[22m
[90m    Curl with no cache & follow the canonical fix and false positive check recipe before fixing: https://react.doctor/docs/rules/react-doctor/no-array-index-as-key[39m

[90m    src/modules/products/ui/storefront/overlays/image-viewer-overlay.tsx:126[39m

  [33m⚠[39m [33mBugs: State initialized from a mount effect[39m [90m×2[39m
    Your users see an extra render with empty "density" because
    a useEffect sets its starting value.
[2m    → Pass the initial value directly to useState() instead of[22m
[2m    setting it from a mount-only useEffect. For SSR hydration,[22m
[2m    prefer useSyncExternalStore().[22m
[90m    Curl with no cache & follow the canonical fix and false positive check recipe before fixing: https://react.doctor/docs/rules/react-doctor/no-initialize-state[39m

[90m    src/modules/products/ui/storefront/product-catalogue.tsx:63[39m

[90m    src/modules/storefront-shell/ui/site-footer.tsx:32[39m

  [33m⚠[39m [33mMaintainability: Component rendered by inline function call[39m
    "renderCards()" hides a component behind an inline call, so
    pull it into its own component and render it as JSX so
    React can track it.
[2m    → Make it a named component rendered as JSX so React can[22m
[2m    track it and preserve its state.[22m
[90m    Curl with no cache & follow the canonical fix and false positive check recipe before fixing: https://react.doctor/docs/rules/react-doctor/no-render-in-render[39m

[90m    src/modules/products/ui/storefront/product-catalogue.tsx:235[39m

  [33m⚠[39m [33mPerformance: array.find() inside a loop[39m
    This gets slow as your list grows because array.find() runs
    inside a loop, so build a Map once before the loop for
    instant lookups
[2m    → Build a `Map` once before the loop instead of calling[22m
[2m    `array.find(...)` inside it[22m
[90m    Curl with no cache & follow the canonical fix and false positive check recipe before fixing: https://react.doctor/docs/rules/react-doctor/js-index-maps[39m

[90m    src/modules/returns/server/commands.ts:90[39m

  [33m⚠[39m [33mMaintainability: React 19 API migration can break callers[39m
    useContext is replaced by `use()` in React 19, which reads
    context inside ifs & loops too, so switch to `import { use
    } from 'react'`.
[2m    → Pass `ref` as a normal prop on function components, since[22m
[2m    `forwardRef` isn't needed in React 19. Replace[22m
[2m    `useContext(X)` with `use(X)`. Only runs on React 19+[22m
[2m    projects.[22m
[90m    Curl with no cache & follow the canonical fix and false positive check recipe before fixing: https://react.doctor/docs/rules/react-doctor/no-react19-deprecated-apis[39m

[90m    src/modules/storefront-shell/client/storefront-hold-clock.tsx:3[39m

  [33m⚠[39m [33mBugs: Prop mirrored into state via effect[39m
    Your screen shows the old value first because useState
    "currentSession" copies prop "session" through this effect.
[2m    → Delete both the `useState` and the `useEffect` and read[22m
[2m    the prop directly while rendering. Copying a prop into[22m
[2m    state shows the old value on the first render before the[22m
[2m    effect catches up.[22m
[90m    Curl with no cache & follow the canonical fix and false positive check recipe before fixing: https://react.doctor/docs/rules/react-doctor/no-mirror-prop-effect[39m

[90m    src/providers/session-provider.tsx:47[39m


[2m  ────────────────────────────────────────────────────────────[22m

  [1mAll 185 issues[22m

  [1mSecurity[22m [2m›[22m [31m2 errors[39m[2m, [22m[33m[2m12 warnings[22m[39m
  [1mBugs[22m [2m›[22m [31m11 errors[39m[2m, [22m[33m[2m39 warnings[22m[39m
  [1mPerformance[22m [2m›[22m [33m[2m59 warnings[22m[39m
  [1mAccessibility[22m [2m›[22m [33m[2m15 warnings[22m[39m
  [1mMaintainability[22m [2m›[22m [33m[2m47 warnings[22m[39m

[1mAgent guidance[22m
[90m  - Treat React Doctor diagnostics as starting hypotheses. Read the relevant code before confirming or suppressing each finding.[39m
[90m  - For each group, decide true positive, false positive, or needs-human-review, then assign high/medium/low confidence.[39m
[90m  - Do not suppress a finding without evidence from the file in question. Confidence requires code context.[39m
[90m  - Understand the root cause before editing. Fix the underlying code instead of changing react-doctor config or suppressing rules unless explicitly asked.[39m
[90m  - Investigate deeply where relevant: race conditions, security-sensitive flows, state propagation, multi-file refactors, and downstream dependency chains.[39m
[90m  - Ignore pure style preferences, theoretical issues without real impact, missing features, and unrelated pre-existing code.[39m
[90m  - Start with high-confidence fixes that preserve behavior. Leave low-confidence or product-dependent changes as notes.[39m
[90m  - Run `npx react-doctor@latest --verbose --scope changed` before and after changes, plus relevant tests after each focused batch.[39m
[90m  - When available, spawn subagents or isolated worktrees for independent rule families, then review and merge only the best safe fixes.[39m
[90m  - Split unrelated, broad, or behavior-changing work into separate PRs/branches instead of one large cleanup.[39m
[90m  - When one rule spans dozens of files (a migration-scale change), fix a representative sample first, confirm the recipe holds, and get the code owner's sign-off before changing the rest. Don't mass-fix a broad pattern in one unreviewed pass.[39m
[90m  - For confirmed issues that cannot be fixed now, create GitHub issues with the rule, file/line, confidence, impact, and proposed fix.[39m
[90m  - If a fix needs an API, UX, or architecture decision, stop and ask before editing.[39m

  React Doctor [2m(https://react.doctor)[22m
  [90mScore disabled by --no-score. Want something custom to your company? Contact us at https://react.doctor/enterprise.[39m

[90m  Full diagnostics written to C:\Users\olaitan\AppData\Local\Temp\react-doctor-1536a332-2f32-4e4b-ba74-f9e903dfdeb6[39m

[33m  Note: dead-code checks failed — score may be incomplete.[39m

[2m  ────────────────────────────────────────────────────────────[22m

  [1mDocs:[22m [36mhttps://react.doctor/docs[39m
[2m  Learn more about fixing issues, setting up CI/CD, and[22m
[2m  configuring rules with a config file[22m

  [1mGitHub:[22m [36mhttps://github.com/millionco/react-doctor[39m
[2m  Report issues and star the repository![22m

[ELIFECYCLE] Command failed with exit code 1.

```
</details>
