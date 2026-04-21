# tailwind-intellisense-fixer

![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-111827?logo=tailwindcss)
![Validation](https://img.shields.io/badge/validation-live_diagnostics-111827)

Repository name: `tailwind-skills`.
Published skill name: `tailwind-intellisense-fixer`.

Agent skill for Tailwind CSS v4 projects. It keeps class strings canonical by
checking them against live Tailwind diagnostics.

It is narrow by design: tool for avoiding added Tailwind IntelliSense warnings
and auditing existing live canonical-class diagnostics. It does not replace
broader Tailwind review.

Good fit when you want agent to:

- create new Tailwind components without leaving IntelliSense warnings behind
- clean up existing projects with canonical-class issues
- stay quiet on success and only act when Tailwind server confirms problem

![tailwind-intellisense-fixer flow](./assets/tailwind-intellisense-fixer-flow.svg)

## Why this exists

Agents often generate valid Tailwind that is still non-canonical, like:

```txt
rounded-[2rem] -> rounded-4xl
max-h-[34rem] -> max-h-136
```

Those are not build errors, but they do show up as Tailwind IntelliSense
warnings. This skill uses Tailwind language server directly so fixes come from
same diagnostic source.

## What it does

- designed for hosts that auto-activate installed skills on Tailwind-related work
- validates touched Tailwind files after edits
- fixes only confirmed `suggestCanonicalClasses` diagnostics
- stays silent on clean edit runs
- supports explicit scan mode for audits
- fails closed if live Tailwind validation is unavailable
- supplements broader Tailwind review instead of replacing it

## Intended scope

- prevent agent from adding or leaving Tailwind IntelliSense warnings during edits
- auto-fix confirmed warning diagnostics in touched files
- optionally scan for existing live canonical-class warnings when user asks
- do not treat this skill as full Tailwind review
- broader Tailwind issue/review/practice asks should continue beyond this skill

## How it works

Skill bundles helper scripts at:

```txt
skills/tailwind-intellisense-fixer/bin/tailwind-diagnostics.mjs
skills/tailwind-intellisense-fixer/bin/tailwind-scan.mjs
```

Diagnostics helper does three things:

1. detect repo package manager from `package.json` or lockfile
2. launch Tailwind language server with matching transient runner
3. return compact JSON diagnostics for target files

Scan helper does two things before diagnostics:

1. pre-filter repo with `rg` for likely Tailwind-bearing files only
2. batch discovered files into one diagnostics helper run

Transient command used:

- `pnpm --package=@tailwindcss/language-server dlx tailwindcss-language-server --stdio`
- `npx -y --package @tailwindcss/language-server tailwindcss-language-server --stdio`
- `bunx --package @tailwindcss/language-server tailwindcss-language-server --stdio`

No permanent dependency install required. First run may need network if package
is not cached.

## Modes

### Guard mode

Normal edit flow.

- scope: touched files only
- fix target: `suggestCanonicalClasses`
- loop: validate, fix, final validate
- success output: silent by default

### Scan mode

Used when user explicitly asks to scan, audit, or review existing Tailwind issues.

- agent or scan helper pre-filters likely Tailwind files by extension and content signal
- diagnostics run once for discovered files, not once per file
- returns findings grouped by file
- broad Tailwind asks should continue with broader checks after scan

## Trigger

Skill should activate only when task clearly involves Tailwind CSS.

Typical signals:

- explicit request for `tailwind-intellisense-fixer`
- explicit ask whether file, component, or repo has Tailwind issues or warnings
- `class=` or `className=`
- `tw`, `clsx`, `cn`, `cva`
- `@import "tailwindcss"`
- `@theme`, `@apply`, `@utility`, `@variant`
- explicit Tailwind or UI styling requests
- request to build new frontend part in repo already using Tailwind

Interpret request shape carefully:

- `warnings`, `IntelliSense`, `canonical classes`: narrow diagnostic request; fix confirmed warnings automatically
- `issues`, `problems`, `practices`, `review`, `audit`: broader Tailwind request; use this skill as supporting input, then continue broader Tailwind checks and return combined result
- new frontend/UI work in Tailwind project: run this skill after edits and auto-fix confirmed warnings in touched files

## Install

Local install recommended first.

```bash
# current project
npx skills add . --skill tailwind-intellisense-fixer

# global
npx skills add . --skill tailwind-intellisense-fixer -g
```

## Usage

Normal Tailwind edit flow should not need manual invocation on hosts that auto-load installed skills.

Examples:

```txt
Build team builder card with Tailwind.
```

```txt
Fix Tailwind canonical warnings in app/team/_components/TeamBuilderClient.tsx.
```

```txt
Use tailwind-intellisense-fixer skill to scan this project for Tailwind canonical-class warnings.
```

Direct helper usage:

```bash
node skills/tailwind-intellisense-fixer/bin/tailwind-scan.mjs --workspace .
```

Discovery only:

```bash
node skills/tailwind-intellisense-fixer/bin/tailwind-scan.mjs --workspace . --discover-only
```

## Behavior guarantees

- no docs-only rewrite guesses
- no repo-wide scan during normal edits
- no fix outside touched files in normal edit flow unless user asks for repo-wide review/scan
- no canonical rewrite if Tailwind language server cannot validate
- no claim of complete Tailwind review coverage

## What this repo implements

- `SKILL.md` instructions for host agent
- diagnostics helper that runs Tailwind language server and returns diagnostics
- scan helper that pre-filters likely Tailwind files and batches diagnostics

## What host must provide

- skill loading
- tool execution
- edit -> validate -> fix orchestration if you want full loop automated

## Requirements

- Tailwind project
- Node.js runtime
- repo package manager available: `npm`, `pnpm`, or `bun`
- network on first helper run if Tailwind language server is not cached

## License

MIT. See [LICENSE](./LICENSE).

## Limits

- current auto-fix scope is intentionally narrow: `suggestCanonicalClasses`
- broad scans pre-filter likely Tailwind files before validation
- broad scans batch discovered files into one diagnostics helper run
- repo-wide scan result is one input, not full Tailwind review
- behavior depends on Tailwind language server being able to analyze project

## TODO

- tighten non-blocking skill wording so broad Tailwind asks reliably continue past diagnostics step in host agents

## Structure

```txt
assets/
└── tailwind-intellisense-fixer-flow.svg

skills/tailwind-intellisense-fixer/
├── SKILL.md
└── bin/
    ├── tailwind-diagnostics.mjs
    └── tailwind-scan.mjs
```
