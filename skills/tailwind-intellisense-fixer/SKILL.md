---
name: tailwind-intellisense-fixer
description: >
  Fixes Tailwind CSS suggestCanonicalClasses warnings using the live language
  server. Use this whenever the user explicitly invokes /tailwind-intellisense-fixer,
  reports Tailwind IntelliSense or canonical-class warnings, asks to fix or avoid
  those warnings, or does not want to clean them up manually. Also activate
  silently as a post-write step when the agent itself created or edited
  frontend files in a Tailwind CSS project in the CURRENT turn and the touched
  files contain Tailwind class strings or directives. Do not activate for
  general Tailwind how-to questions, read-only analysis, non-Tailwind projects,
  or frontend work that did not touch Tailwind-bearing code.
metadata:
  version: 0.5.0
  license: MIT
---

# Tailwind IntelliSense Fixer

## Activate when

**Case 1 — explicit command:** user invokes `/tailwind-intellisense-fixer`
(with or without trailing text/questions)
→ scan all Tailwind files across the repo

**Case 2 — explicit warning remediation:** user reports Tailwind IntelliSense
warnings, canonical-class warnings, or asks assistant to fix/avoid those warnings
for them
→ run live diagnostics against the relevant files or current worktree, fix only
confirmed warnings, then re-run once

**Case 3 — post-write:** agent just created or modified files containing
Tailwind class strings or directives (`class=`, `className=`, `clsx`, `cn`,
`cva`, `tw`, `@apply`, `@theme`, `@utility`, `@variant`, `@import "tailwindcss"`)
**and** the project uses Tailwind CSS (has `tailwindcss` in
`package.json` dependencies, a `tailwind.config.*` file, or
`@import "tailwindcss"` in a CSS file)
→ check only the touched files

Everything else: do not activate. This is not a general Tailwind helper, review,
or teaching tool.

---

## Execution

The bins live at `.claude/skills/tailwind-intellisense-fixer/bin/` (local project install)
or `~/.claude/skills/tailwind-intellisense-fixer/bin/` (global install). Resolve whichever
exists — local takes precedence.

**Case 1 — full repo scan:**

```bash
_TW_BIN=".claude/skills/tailwind-intellisense-fixer/bin"
[ ! -f "$_TW_BIN/tailwind-scan.mjs" ] && _TW_BIN="$HOME/.claude/skills/tailwind-intellisense-fixer/bin"
node "$_TW_BIN/tailwind-scan.mjs" --workspace . --code suggestCanonicalClasses
```

**Case 2/3 — targeted check (warning remediation or touched files only):**

```bash
_TW_BIN=".claude/skills/tailwind-intellisense-fixer/bin"
[ ! -f "$_TW_BIN/tailwind-diagnostics.mjs" ] && _TW_BIN="$HOME/.claude/skills/tailwind-intellisense-fixer/bin"
node "$_TW_BIN/tailwind-diagnostics.mjs" \
  --workspace . \
  --files <comma-separated-paths> \
  --code suggestCanonicalClasses
```

For each returned diagnostic: find exact class token at reported line/col →
replace only that token with canonical form from `diagnostic.message`.
Do not remove comments, reformat unrelated classes, reorder code, or make any
other cleanup while running this skill.

Re-run once to confirm clean. If warnings remain after one fix pass, report
them — do not attempt a second fix.

---

## Report

**Case 1 (user ran the command — be informative):**

```
Tailwind: fixed M warnings in N files.
Tailwind: 0 warnings across N files — all clean.
Tailwind: M warnings remain — file:line "class" → "canonical"
Tailwind: language server unavailable — <error>
  Ensure @tailwindcss/language-server is resolvable via your package manager.
```

**Case 2 (user asked about warnings — be informative):**

```
Tailwind: fixed M warnings in N files.
Tailwind: 0 warnings across N files — all clean.
Tailwind: M warnings remain — file:line "class" → "canonical"
Tailwind: language server unavailable — <error>
  Ensure @tailwindcss/language-server is resolvable via your package manager.
```

**Case 3 (background step — exactly one terse footer line):**

```
Tailwind: fixed M warnings in N files.
Tailwind: 0 warnings.
Tailwind: M warnings remain — file:line message
Tailwind: LS unavailable — skipped.
```

The footer exists so the user can tell the check ran and whether it succeeded,
without turning the auto-trigger into a second response.

---

## Rules

- No narration, preamble, or "Thinking:" text — ever. Only the one-line report.
- Case 2 is for explicit warning cleanup asks. It can run before or after edits depending on task flow, but always report the final live result.
- Case 3 order: finish the main task response first (write code, describe what you did), then run diagnostics as the final step and append the footer at the very end.
- Case 3 is quiet but not invisible. Always append exactly one terse `Tailwind:` footer line so the user can verify the check ran.
- Case 3 footer is status only. Do not add explanation, reasoning, or extra narration before or after it.
- No guessing. Only fix what the diagnostic returns.
- Keep edit scope surgical. Replace only class tokens named by diagnostics. Leave comments, nearby formatting, unrelated classes, and unrelated refactors alone.
- Case 3 only fires when Write or Edit tool was used in the current turn on a Tailwind project and the touched files contain Tailwind-bearing code. Questions and reads never trigger it.
- Case 1 LS failure: show the error and explain how to resolve it.
- Case 2 LS failure: show the error and explain how to resolve it.
- Case 3 LS failure: skip silently, append "LS unavailable — skipped."
- Do not activate for general Tailwind questions, styling advice, or read-only reviews unless the user is specifically asking about IntelliSense/canonical warnings.
- Full repo scan (Case 1) can take several minutes on large repos.
