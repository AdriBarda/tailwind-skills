---
name: tailwind-canonical
description: >
  Use this skill on every task that touches a file containing Tailwind CSS classes.
  Fixes IntelliSense warnings by rewriting `utility-[var(--token)]` to the canonical
  v4 form `utility-(--token)`. Activates automatically when editing class or className
  strings in any frontend file (.tsx, .jsx, .vue, .svelte, .astro, .html).
metadata:
  version: 0.1.0
license: MIT
---

# Tailwind Canonical

## What this skill does

Apply frontend styling changes while keeping Tailwind output canonical, compact, and consistent with local project conventions.

## When to use

Use this skill when:

- editing Tailwind class strings in any frontend framework (React, Vue, Svelte, Astro, HTML, etc.)
- refactoring UI code that uses Tailwind CSS
- fixing Tailwind IntelliSense warnings
- converting arbitrary values into clearer canonical forms
- cleaning up inconsistent token usage

Do not use this skill when:

- the task is backend-only
- the file does not use Tailwind
- the request is unrelated to styling or class changes

## Inputs needed

- the file or code snippet being changed
- nearby template or component patterns if available
- any project-specific token conventions already present in the file or repo

## Tailwind version

These conventions target **Tailwind CSS v4**. v4 introduces custom-property shorthand syntax using parentheses. This is valid and canonical — do not rewrite it.

| v4 canonical (correct)       | v3 form (do not use)                      |
| ---------------------------- | ----------------------------------------- |
| `text-(--token)`             | `text-[--token]` or `text-[var(--token)]` |
| `bg-(--token)`               | `bg-[var(--token)]`                       |
| `font-(family-name:--token)` | `font-[family:var(--token)]`              |

If you see `utility-(--token)` or `utility-(modifier:--token)`, that is **correct v4 syntax**. Never rewrite parenthesis form to bracket form.

## Procedure

0. **Only change what has a documented warning or was explicitly requested. Do not normalize, improve, or touch classes that are already valid.**
1. Make the requested UI change without changing behavior unless explicitly asked.
2. Prefer standard documented Tailwind utilities over arbitrary values.
3. Reuse existing project tokens and surrounding class conventions.
4. If a CSS custom property can be expressed with Tailwind v4 custom-property shorthand `utility-(--token)`, prefer that over bracket syntax.
5. Avoid invented utilities.
6. Avoid duplicate or conflicting utilities unless a deliberate override is clearly needed.
7. Keep class lists readable and consistent with nearby code.

For rewrite examples and normalization patterns, see [references/conventions.md](references/conventions.md).

## Validation

Before returning:

- check for invalid Tailwind classes
- check for non-canonical syntax
- check for unnecessary arbitrary values
- check for conflicting utilities
- check whether any remaining arbitrary value is justified
- **do NOT rewrite `utility-(--token)` to `utility-[--token]`** — parenthesis form is canonical in Tailwind v4

## Output

1. Return the final code first.
2. Then add a short section named `Tailwind review`.
3. Keep the review to at most 3 bullets.
4. Mention only:
   - syntax you normalized
   - arbitrary values intentionally kept
   - assumptions that depend on local project config

## Failure modes

- If the project clearly uses a local convention that differs from the general canonical form, preserve the project convention and mention it in `Tailwind review`.
- If there is no documented utility or token that fits, keep the arbitrary value and explain why briefly.
- **Never add classes that did not exist in the original.** If a class appears to be missing, ask — do not invent a replacement.
