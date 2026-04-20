# Tailwind canonical conventions

Goal: prefer canonical Tailwind v4 syntax and eliminate IntelliSense warnings.

## Tailwind version

These conventions target **Tailwind CSS v4**. v4 expanded what can be expressed
without brackets — numeric values, decimals, and custom-property shorthands are
all valid directly in the class name.

## The core rule

**Brackets are a last resort.** Before using `utility-[value]`, ask:
can this value be expressed without brackets? If yes, do it.

There are three ways to eliminate brackets, in order of preference:

---

### 1. Named utility — use it if one exists

Tailwind documents named aliases for common values. If a named utility maps to
the value, use it.

Pattern: `utility-[value]` → `utility-name`

Examples:

- `rounded-[2rem]` → `rounded-4xl`
- `w-[100%]` → `w-full`
- `text-[14px]` → `text-sm`
- `inset-[0]` → `inset-0`

To check: if IntelliSense suggests a rewrite, apply it. If unsure, prefer the
named form whenever the semantic match is clear.

---

### 2. Bare value — drop the brackets if the value works directly

Tailwind v4 accepts numeric and decimal values directly as part of the class name,
without brackets, for most utilities.

Pattern: `utility-[value]` → `utility-value`

Examples:

- `p-[16px]` → `p-4` (if 16px = 1rem) or `p-16px` if no scale match
- `p-[17.75rem]` → `p-17.75`
- `w-[320px]` → `w-320px` or `w-80` if scale matches
- `gap-[1.5rem]` → `gap-6` if scale matches, otherwise `gap-1.5`
- `mt-[10px]` → `mt-2.5`

The test: remove the brackets. If the result is a valid Tailwind class, use it.

---

### 3. Custom property shorthand — use parentheses, not brackets

When the value is a CSS custom property, use the v4 parenthesis shorthand.

Pattern: `utility-[var(--token)]` → `utility-(--token)`

Examples:

- `border-[var(--color-outline)]` → `border-(--color-outline)`
- `text-[var(--color-ink)]` → `text-(--color-ink)`
- `bg-[var(--color-surface)]` → `bg-(--color-surface)`

Special case for font family: `font-[family:var(--token)]` → `font-(family-name:--token)`

**Never revert parenthesis form to bracket form** — that is a regression to v3 syntax.

---

## When brackets are justified

Keep `utility-[value]` only when all three of the following are true:

1. No named utility exists for that value
2. The bare value form is not valid for that utility
3. It is not a CSS custom property

If you keep a bracket value, mention it in `Tailwind review`.

## Avoid

- invented utilities not in the Tailwind docs
- conflicting utilities like `px-4 px-6` unless intentional
- mixing `utility-[var(--x)]` and `utility-(--x)` in the same file
