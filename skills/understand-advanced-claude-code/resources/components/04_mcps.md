# MCPs

**Official docs:** https://code.claude.com/docs/en/mcp

---

## What It Gives You

**External tools with state.** MCPs can:
- Persist state across calls
- Enforce valid transitions
- Capture typed data
- Run pipelines in background

---

## What It Doesn't Give You (natively)

- No coordination between MCPs
- No progressive disclosure (all tools loaded at once)
- Context explosion with many MCPs

---

## MCPs as Control Systems

State + enforcement + typed data = control.

```python
@mcp.tool()
def start_workflow(name: str):
    state.current_workflow = name
    state.current_step = 0
    return get_step_instructions(0)

@mcp.tool()
def next_step():
    if not valid_transition(state.current_step, state.current_step + 1):
        return {"error": "Complete current step first"}
    state.current_step += 1
    capture_typed_data(state)
    return get_step_instructions(state.current_step)
```

State machine inside MCP. Enforcement at each transition.

---

## The Control It Enables

```
MCP captures typed event
    ↓
Background process routes by type
    ↓
Assembles derived objects
    ↓
Triggers next phase automatically
```

Without types, data is blobs. With typed MCPs, data flows.
