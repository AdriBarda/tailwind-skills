---
name: tailwind-canonical
description: >
  Activate only for Tailwind CSS work. After editing Tailwind-bearing files,
  validate touched files with Tailwind language server and fix only confirmed
  canonical-class diagnostics. Use explicit scan mode for repo audits.
metadata:
  version: 0.3.0
  license: MIT
---

# Tailwind Canonical

## Goal

Keep Tailwind output IntelliSense-clean with live Tailwind diagnostics, not
guesses.

## Trigger

Activate only when current task involves Tailwind CSS.

Strong signals:

- user mentions `tailwind`, utility classes, responsive variants, `@theme`, `@apply`, or UI styling
- touched file contains `class=`, `className=`, `tw`, `clsx`, `cn`, `cva`
- touched file contains `@import "tailwindcss"`, `@theme`, `@apply`, `@utility`, `@variant`

Do not activate for backend-only work or non-Tailwind files.

## Modes

### Guard mode

Default mode for normal edit tasks.

1. Make requested change first.
2. Track only touched Tailwind-bearing files.
3. Run bundled helper on touched files only:

   ```
   node skills/tailwind-canonical/bin/tailwind-diagnostics.mjs --workspace <repo-root> --file <relative-path> --code suggestCanonicalClasses
   ```

4. Fix only diagnostics returned by helper.
5. Re-run helper once.
6. If clean, say nothing about Tailwind review unless user asked.

### Scan mode

Use only when user explicitly asks to scan, audit, or review existing Tailwind
issues.

1. Discover likely Tailwind files by extension and Tailwind signals.
2. Run helper on discovered files.
3. Report compact findings grouped by file, then code/count.
4. Only fix findings if user explicitly asked.

## Validation source

Use live Tailwind diagnostics only. Bundled helper detects project package
manager, launches Tailwind language server via transient runner, and returns
compact JSON diagnostics.

Runner order:

1. `packageManager` in `package.json`
2. lockfile fallback
3. matching command:
   - `pnpm dlx @tailwindcss/language-server --stdio`
   - `npx -y @tailwindcss/language-server --stdio`
   - `bunx @tailwindcss/language-server --stdio`

## Scope

Hot path stays narrow.

- Guard mode: touched files only
- v1 fixes: `suggestCanonicalClasses` only
- max loop: validate, fix, final validate
- no repo-wide scan unless user asked

## Failure policy

Fail closed.

- If helper or language server unavailable, do not guess canonical rewrites.
- If warning is ambiguous, leave code as-is and report exact diagnostic.
- Never expand fix scope beyond touched files in guard mode unless user asks.

## Output

- Guard mode success: silent
- Guard mode failure: one short blocker line
- Scan mode: compact findings only
