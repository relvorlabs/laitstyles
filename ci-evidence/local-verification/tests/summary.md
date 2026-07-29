## tests

**Result:** failed

| Gate | Required | Result | Duration |
| --- | --- | --- | ---: |
| vitest | yes | failed | 299.6s |

### Diagnostics

<details><summary>❌ vitest</summary>

```text
  }
]
 ❯ src/modules/auth/schema.test.ts:13:28
     11|   it("trims normalized identity fields", () => {
     12|     expect(
     13|       passwordSignUpSchema.parse({
       |                            ^
     14|         email: "  shopper@example.com ",
     15|         password: "password123",

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { _zod: { def: [ { expected: 'string', code: 'invalid_type', path: [ 'confirmPassword' ], message: 'Invalid input: expected string, received undefined' } ], constr: 'Function<ZodError>', traits: { constructor: 'Function<Set>', has: 'Function<has>', add: 'Function<add>', delete: 'Function<delete>', difference: 'Function<difference>', clear: 'Function<clear>', entries: 'Function<entries>', forEach: 'Function<forEach>', intersection: 'Function<intersection>', isSubsetOf: 'Function<isSubsetOf>', isSupersetOf: 'Function<isSupersetOf>', isDisjointFrom: 'Function<isDisjointFrom>', size: 2, symmetricDifference: 'Function<symmetricDifference>', union: 'Function<union>', values: 'Function<values>', keys: 'Function<values>' }, deferred: [] }, issues: [ { expected: 'string', code: 'invalid_type', path: [ 'confirmPassword' ], message: 'Invalid input: expected string, received undefined' } ], format: 'Function<value>', flatten: 'Function<value>', addIssue: 'Function<value>', addIssues: 'Function<value>', isEmpty: false }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/8]⎯

 FAIL  src/modules/auth/schema.test.ts > password auth schemas > requires names, terms, and an eight-character sign-up password
AssertionError: expected { …(5) } to deeply equal { …(4) }

- Expected
+ Received

  {
+   "confirmPassword": "Invalid input: expected string, received undefined",
    "first": "Enter your first name.",
    "last": "Enter your last name.",
    "password": "Password must be at least 8 characters.",
    "terms": "Please accept the Terms to continue.",
  }

 ❯ src/modules/auth/schema.test.ts:53:43
     51|     if (result.success) return;
     52|
     53|     expect(authFieldErrors(result.error)).toEqual({
       |                                           ^
     54|       password: "Password must be at least 8 characters.",
     55|       first: "Enter your first name.",

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/8]⎯

 FAIL  src/features/storefront/shared/storefront-client-state-persistence.test.ts > storefront client-state persistence failures > does not clean legacy keys when the canonical write fails
AssertionError: expected null not to be null
 ❯ src/features/storefront/shared/storefront-client-state-persistence.test.ts:50:42
     48|     ).not.toThrow();
     49|     expect(session.getItem(STOREFRONT_CLIENT_STATE_STORAGE_KEY)).toBeN…
     50|     expect(local.getItem(legacyKey)).not.toBeNull();
       |                                          ^
     51|   });
     52|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/8]⎯

 FAIL  src/modules/inventory/client/api.test.ts > inventory browser API > posts stock adjustments through the versioned inventory boundary
AssertionError: expected { method: 'POST', …(2) } to match object { method: 'POST', headers: { …(1) } }
(1 matching property omitted from actual)

- Expected
+ Received

  {
-   "headers": {
-     "Content-Type": "application/json",
-   },
+   "headers": Headers {},
    "method": "POST",
  }

 ❯ src/modules/inventory/client/api.test.ts:140:18
    138|       "/api/v1/admin/inventory/adjustments",
    139|     );
    140|     expect(init).toMatchObject({
       |                  ^
    141|       method: "POST",
    142|       headers: { "Content-Type": "application/json" },

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/8]⎯

 FAIL  src/app/api/v1/admin/inventory/route.test.ts > /api/v1/admin/inventory > rejects an unsupported page size before any domain query
AssertionError: expected 422 to be 400 // Object.is equality

- Expected
+ Received

- 400
+ 422

 ❯ src/app/api/v1/admin/inventory/route.test.ts:112:29
    110|     const response = await GET(new Request("http://localhost/api/v1/ad…
    111|
    112|     expect(response.status).toBe(400);
       |                             ^
    113|     await expect(response.json()).resolves.toMatchObject({
    114|       error: { code: "INVALID_QUERY", fieldErrors: { pageSize: expect.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/8]⎯

 FAIL  src/app/api/v1/admin/inventory/adjustments/route.test.ts > POST /api/v1/admin/inventory/adjustments > validates the body before calling the domain command
AssertionError: expected 422 to be 400 // Object.is equality

- Expected
+ Received

- 400
+ 422

 ❯ src/app/api/v1/admin/inventory/adjustments/route.test.ts:53:29
     51|     const response = await POST(adjustmentRequest({ quantityDelta: 0 }…
     52|
     53|     expect(response.status).toBe(400);
       |                             ^
     54|     await expect(response.json()).resolves.toMatchObject({
     55|       error: {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/8]⎯


 Test Files  7 failed | 124 passed (131)
      Tests  8 failed | 608 passed | 6 skipped (622)
   Start at  18:22:40
   Duration  280.47s (transform 37.26s, setup 0ms, import 703.77s, tests 125.08s, environment 318.09s)


```
</details>
