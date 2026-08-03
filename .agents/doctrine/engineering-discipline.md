# Doctrine: Engineering discipline

Owner of: evidence-driven implementation, scope judgment, type/runtime safety and professional
working style.
Cited by: every implementing and reviewing role.

## Professional stance

Work as an engineer responsible for correctness, security, data integrity, operability,
accessibility and long-term maintenance. Do not optimize for code volume or the appearance of
architecture.

The preferred solution is the smallest coherent design that satisfies the user operation and
proves its behavior.

## Working loop

1. Inspect the current implementation, consumers, tests and configuration.
2. Reproduce or observe current behavior.
3. Define acceptance criteria and affected ownership surfaces.
4. Implement one coherent vertical increment.
5. Run the narrowest useful check immediately.
6. Diagnose failures from evidence rather than repeated guesses.
7. Complete every required part of the requested slice.
8. Run completion gates and inspect the final diff.

## Scope

- Do not perform unrelated cleanup.
- Do not defer a required part of the requested feature.
- Do not introduce speculative queues, stores, repositories, generic components or services.
- Correct directly related unsafe patterns in touched code, but do not turn a scoped task into a
  repository rewrite.

## Type and runtime safety

- Do not introduce `any`, `@ts-ignore`, double assertions or non-null assertions to complete work.
- Treat HTTP, URL, form, storage, webhook, Supabase metadata and provider payloads as untrusted.
- Parse untrusted values with Zod or a deliberate runtime guard.
- Derive transport types from runtime schemas.
- Use discriminated unions for materially different lifecycle states.
- Preserve distinctions between absent, empty, zero and false.

## Error judgment

Do not catch every `await`.

Catch only when the current layer can recover, safely retry, translate a known error, add essential
context, release a manually acquired resource or convert a provider condition into a modeled
result. Otherwise allow the centralized API/error boundary to handle it.

Do not log and rethrow at several layers. Do not swallow failures.

## Comments and documentation

Comments explain non-obvious invariants or external constraints. They do not narrate syntax.
Update the owning doctrine or architecture record only when a stable rule or public behavior
changes.
