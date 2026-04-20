# tailwind-canonical

Repository name: `tailwind-agent-skills`.
Published skill name: `tailwind-canonical`.

Agent skill for Tailwind CSS v4 projects. It keeps class strings canonical by
checking them against live Tailwind diagnostics instead of guessing from docs or
model memory.

Good fit when you want agent to:

- create new Tailwind components without leaving IntelliSense warnings behind
- clean up existing projects with canonical-class issues
- stay quiet on success and only act when Tailwind server confirms problem

![tailwind-canonical flow](./assets/tailwind-canonical-flow.svg)

## Why this exists

Agents often generate valid Tailwind that is still non-canonical, like:

```txt
rounded-[2rem] -> rounded-4xl
max-h-[34rem] -> max-h-136
```

Those are not build errors, but they do show up as Tailwind IntelliSense
warnings. This skill uses Tailwind language server directly so fixes are based
on same diagnostic source, not hand-written rewrite heuristics.

## What it does

- auto-activates only for Tailwind-related work
- validates touched Tailwind files after edits
- fixes only confirmed `suggestCanonicalClasses` diagnostics
- stays silent on clean edit runs
- supports explicit repo-wide scan mode for audits
- fails closed if live Tailwind validation is unavailable

## How it works

Skill bundles helper script at:

```txt
skills/tailwind-canonical/bin/tailwind-diagnostics.mjs
```

Helper does three things:

1. detect repo package manager from `package.json` or lockfile
2. launch Tailwind language server with matching transient runner
3. return compact JSON diagnostics for target files

Transient command used:

- `pnpm --package=@tailwindcss/language-server dlx tailwindcss-language-server --stdio`
- `npx -y --package @tailwindcss/language-server tailwindcss-language-server --stdio`
- `bunx --package @tailwindcss/language-server tailwindcss-language-server --stdio`

No permanent dependency install required. First run may need network if package
is not cached.

## Modes

### Guard mode

Default mode. Runs after agent edits Tailwind-bearing files.

- scope: touched files only
- fix target: `suggestCanonicalClasses`
- loop: validate, fix, final validate
- success output: silent by default

### Scan mode

Used only when user explicitly asks to scan or audit existing Tailwind issues.

- discovers likely Tailwind files
- returns findings grouped by file
- fixes only if user explicitly asks

## Trigger

Skill should activate only when task clearly involves Tailwind CSS.

Typical signals:

- `class=` or `className=`
- `tw`, `clsx`, `cn`, `cva`
- `@import "tailwindcss"`
- `@theme`, `@apply`, `@utility`, `@variant`
- explicit Tailwind or UI styling requests

## Install

Local install recommended first.

```bash
# current project
npx skills add . --skill tailwind-canonical

# global
npx skills add . --skill tailwind-canonical -g
```

## Usage

Normal Tailwind edit flow should not need manual invocation.

Examples:

```txt
Build team builder card with Tailwind.
```

```txt
Fix Tailwind canonical warnings in app/team/_components/TeamBuilderClient.tsx.
```

```txt
Use tailwind-canonical skill to scan this project for Tailwind canonical-class warnings.
```

## Behavior guarantees

- no docs-only rewrite guesses
- no repo-wide scan during normal edits
- no fix outside touched files in guard mode unless user asks
- no canonical rewrite if Tailwind language server cannot validate

## Requirements

- Tailwind project
- Node.js runtime
- repo package manager available: `npm`, `pnpm`, or `bun`
- network on first helper run if Tailwind language server is not cached

## License

MIT. See [LICENSE](./LICENSE).

## Limits

- current auto-fix scope is intentionally narrow: `suggestCanonicalClasses`
- scan mode reports findings first; it does not auto-fix unless requested
- behavior depends on Tailwind language server being able to analyze project

## Structure

```txt
skills/tailwind-canonical/
├── SKILL.md
├── assets/
│   └── tailwind-canonical-flow.svg
└── bin/
    └── tailwind-diagnostics.mjs
```
