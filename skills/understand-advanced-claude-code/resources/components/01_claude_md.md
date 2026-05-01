# CLAUDE.md

**Official docs:** https://code.claude.com/docs/en/memory

---

## What It Gives You

An injection point. Text loaded at the start of every conversation.

---

## What It Doesn't Give You

- No verification instructions were followed
- No conditional loading
- No state tracking
- No enforcement

---

## Key Insight: Prompts Hope, Hooks Enforce

CLAUDE.md is a trigger system, not a control system.

**The prompt hopes you'll follow rules. Hooks actually enforce them.**

Instead of:
> "Follow REST conventions in src/api/"

Do:
> PreToolUse hook on Edit to src/api/** that blocks if architecture violations found.

**Prompts suggest. Hooks control.**

---

## Best Practices

**Minimal triggers, not logic:**

```markdown
ONE THING AT A TIME.
Use the Task tool to track complex work.
```

These are sticky notes pointing to real systems. Don't try to put control logic in CLAUDE.md — put it in hooks and skills.
