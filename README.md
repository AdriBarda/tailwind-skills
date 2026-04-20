# tailwind-agent-skills

Minimal agent skills package for canonical Tailwind cleanup with Tailwind CSS v4-oriented conventions.

Useful when an agent generates valid-but-non-canonical Tailwind classes that later trigger IntelliSense suggestions or inconsistent class syntax.

## Included skill

- `tailwind-canonical` — normalizes Tailwind classes to canonical IntelliSense-friendly forms and reduces unnecessary arbitrary values.

## What it helps with

- rewriting `utility-[var(--token)]` to canonical v4 `utility-(--token)` syntax
- reducing unnecessary arbitrary values when a documented utility already exists
- keeping Tailwind class strings more consistent during frontend edits
- cleaning up IntelliSense warnings related to non-canonical class forms

## Scope

- intended for projects using Tailwind CSS classes in frontend templates or components
- especially useful when an agent is editing `class` or `className` strings
- conventions are written around Tailwind CSS v4 syntax

## Limits

- assumes Tailwind CSS v4 conventions
- may preserve arbitrary values when no clear canonical rewrite exists
- does not validate custom theme tokens or plugin utilities unless they are evident in the target repo

## Example rewrites

```txt
text-[var(--color-ink)] -> text-(--color-ink)
bg-[var(--color-surface)] -> bg-(--color-surface)
rounded-[2rem] -> rounded-4xl
```

## Install with pnpm

```bash
pnpm dlx skills add . --skill tailwind-canonical
```

## Install from git

```bash
pnpm dlx skills add <repo-url> --skill tailwind-canonical
```

## Notes

- this repo currently contains one skill: `tailwind-canonical`
- the skill also includes a reference file with rewrite patterns in `skills/tailwind-canonical/references/conventions.md`
