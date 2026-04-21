---
name: tailwind-intellisense-fixer
description: >
  Tailwind IntelliSense guard. Use live Tailwind diagnostics to prevent or fix
  canonical-class warnings during Tailwind edits. This skill is narrow: it does
  not replace broader Tailwind review.
metadata:
  version: 0.7.0
  license: MIT
---

# Tailwind IntelliSense Guard

## Intent

Use this skill to avoid adding or leaving Tailwind IntelliSense warnings.

This skill is for live diagnostic warnings only. It is not full Tailwind,
layout, accessibility, config, or styling review.

## Trigger

Activate when task clearly involves Tailwind CSS, especially if:

- user asks about Tailwind warnings, IntelliSense issues, or canonical classes
- user asks about broader Tailwind issues, problems, practices, review, or audit
- task creates or edits frontend/UI code in Tailwind project
- touched file contains `class=`, `className=`, `tw`, `clsx`, `cn`, `cva`, `@apply`, `@theme`, `@utility`, `@variant`, or `@import "tailwindcss"`

Do not activate for backend-only work or non-Tailwind files.

## Rules

- Warning-only asks: this skill can be primary path.
- Warning-only asks must run fresh live diagnostics against current worktree. Do not answer from memory, prior scan output, lint output, or build output.
- Broad Tailwind asks like `issues`, `problems`, `practices`, `review`, `audit`: run fresh live diagnostics against current worktree first. Use this skill as supporting check only. Do not answer from memory, prior scan output, lint output, or build output. Do not treat warning flow or scan result as final answer. Continue with any broader Tailwind checks that fit task. Do not ask user whether to continue.
- New Tailwind UI work: after edits, validate touched Tailwind-bearing files and fix confirmed warnings automatically.
- Explicit warning or IntelliSense asks: fix confirmed warnings automatically. Do not ask for confirmation first.
- Keep fix scope narrow: touched files in normal edit flow; repo-wide only when user explicitly asks for repo scan/review/audit.

## Flow

### Normal edit flow

1. Make requested Tailwind change.
2. Track touched Tailwind-bearing files only.
3. Run diagnostics helper on touched files:

   ```
   node skills/tailwind-intellisense-fixer/bin/tailwind-diagnostics.mjs --workspace <repo-root> --file <relative-path> --code suggestCanonicalClasses
   ```

4. Fix confirmed `suggestCanonicalClasses` diagnostics automatically.
5. Re-run helper once.

### Broad review flow

1. Run scan helper:

   ```
   node skills/tailwind-intellisense-fixer/bin/tailwind-scan.mjs --workspace <repo-root> --code suggestCanonicalClasses
   ```

2. Use fresh result as one input.
3. Continue with any broader Tailwind checks task calls for.
4. Return combined answer, not scan result alone.

### Warning-only check flow

Use this flow only when user asked specifically about warnings, IntelliSense, or canonical classes.

1. Run fresh live diagnostics against current worktree.
2. If confirmed `suggestCanonicalClasses` warnings exist, fix them automatically.
3. Re-run diagnostics once.
4. Report final live result.

## Source

Use live Tailwind diagnostics only.

Runner order:

1. `packageManager` in `package.json`
2. lockfile fallback
3. matching command:
   - `pnpm --package=@tailwindcss/language-server dlx tailwindcss-language-server --stdio`
   - `npx -y --package @tailwindcss/language-server tailwindcss-language-server --stdio`
   - `bunx --package @tailwindcss/language-server tailwindcss-language-server --stdio`

## Failure policy

- If helper or language server unavailable, do not guess canonical rewrites.
- If warning is ambiguous, leave code as-is and report exact diagnostic.
