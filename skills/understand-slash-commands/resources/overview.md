# Slash Commands

**Official docs:** https://code.claude.com/docs/en/slash-commands

---

## What It Gives You

User-initiated text injection. Entry points for the human.

---

## What It Doesn't Give You

- No workflow control (fires once, done)
- No state
- No data capture

---

## The Pattern

Slash commands are **entry points**, not control systems.

```
User: /command arg
    ↓
Something happens
    ↓
Done
```

The command itself is just a trigger. What happens after depends on what it points to (skill, MCP, etc).

---

## Simple Is Better

Keep slash commands brief. They should:
- Trigger something
- Hand off to a control system (MCP, skill, workflow)
- Not try to do everything themselves
