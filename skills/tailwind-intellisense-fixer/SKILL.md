---
name: tailwind-intellisense-fixer
description: >
  Fixes Tailwind CSS suggestCanonicalClasses warnings using the live language
  server. ALWAYS activate when the user explicitly invokes /tailwind-intellisense-fixer
  — regardless of any extra words or questions following the command (e.g.
  "/tailwind-intellisense-fixer is there any issue?" must still run the skill).
  Also activate silently as a post-write step when the Claude agent itself used
  the Write or Edit tool on files in a Tailwind CSS project in the CURRENT turn
  — only when actual file writes happened, never for questions, explanations,
  reads, or analysis. Do NOT activate for any response where no files were
  written or edited, for broad Tailwind questions, or for non-Tailwind projects.
metadata:
  version: 0.4.0
  license: MIT
---

# Tailwind IntelliSense Fixer

## Activate when

**Case 1 — explicit command:** user invokes `/tailwind-intellisense-fixer`
(with or without trailing text/questions)
→ scan all Tailwind files across the repo

**Case 2 — post-write:** agent just wrote or modified files containing
Tailwind class strings (`class=`, `className=`, `clsx`, `cn`, `cva`, `tw`,
`@apply`) **and** the project uses Tailwind CSS (has `tailwindcss` in
`package.json` dependencies, a `tailwind.config.*` file, or
`@import "tailwindcss"` in a CSS file)
→ check only the touched files

Everything else: do not activate. This is not a general Tailwind review tool.

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

**Case 2 — targeted check (touched files only):**

```bash
_TW_BIN=".claude/skills/tailwind-intellisense-fixer/bin"
[ ! -f "$_TW_BIN/tailwind-diagnostics.mjs" ] && _TW_BIN="$HOME/.claude/skills/tailwind-intellisense-fixer/bin"
node "$_TW_BIN/tailwind-diagnostics.mjs" \
  --workspace . \
  --files <comma-separated-paths> \
  --code suggestCanonicalClasses
```

For each returned diagnostic: find the class at the reported line/col →
replace with the canonical form from `diagnostic.message`. Nothing else.

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

**Case 2 (background step — one line appended, no narration):**

```
Tailwind: fixed M warnings in N files.
Tailwind: 0 warnings.
Tailwind: M warnings remain — file:line message
Tailwind: LS unavailable — skipped.
```

---

## Rules

- No narration, preamble, or "Thinking:" text — ever. Only the one-line report.
- Case 2 order: finish the main task response first (write code, describe what you did), then run diagnostics as the final step and append the status line at the very end.
- Case 2 runs silently — one-line report appended to the response, nothing else before or after it.
- No guessing. Only fix what the diagnostic returns.
- Case 2 only fires when Write or Edit tool was used in the current turn on a Tailwind project. Questions and reads never trigger it.
- Case 1 LS failure: show the error and explain how to resolve it.
- Case 2 LS failure: skip silently, append "LS unavailable — skipped."
- Full repo scan (Case 1) can take several minutes on large repos.
