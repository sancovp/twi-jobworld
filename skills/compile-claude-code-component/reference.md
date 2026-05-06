# compile-claude-code-component Reference

## The 7 Primitives

| Primitive | What It Is | Control Level |
|-----------|------------|---------------|
| **CLAUDE.md** | System prompt injection | Trigger (hopes) |
| **Skills** | Extend capabilities, hot reload | Suggestion |
| **Hooks** | Event-driven enforcement | Control |
| **MCPs** | External tools with state | External |
| **Subagents** | Isolated execution contexts | Delegation |
| **Plugins** | Bundled distribution units | Packaging |
| **Teams** | Multiple coordinated sessions | Coordination |

## Build Patterns

### Pattern 1: Simple Skill
```
CLAUDE.md references skill
    ↓
User invokes /skill-name
    ↓
Skill content loads
```
**Components:** Skill only

### Pattern 2: Skill with Scoped Hooks
```
Skill active
    ↓
PreToolUse hook fires
    ↓
Enforces behavior while skill runs
```
**Components:** Skill + Hook (scoped)

### Pattern 3: Forked Research
```
Skill invoked
    ↓
context: fork + agent: Explore
    ↓
Research runs in isolated context
    ↓
Results return
```
**Components:** Skill + Subagent (fork)

### Pattern 4: Specialized Subagent
```
Subagent definition
    ↓
Preloads skills + MCPs + Memory
    ↓
Handles domain-specific work
```
**Components:** Subagent + Skills + MCPs + Memory

### Pattern 5: Observational Loop (Metacog Shell)
```
Executor → Observer → Meta-observer
    ↓           ↓           ↓
Writes     Reads        Reads
cache      cache        cache
    ↓           ↓           ↓
Skill-editor persists improvements
```
**Components:** Team + Subagents + Files (cache)

### Pattern 6: Market Simulation (World of Skillcraft)
```
Agent A ──┐
Agent B ──┼──→ game.json ←── execute.sh
Agent C ──┘         │
                    ↓
              WebSocket Server
```
**Components:** Team + Shared State + Scripts

### Pattern 7: MCP-powered Workflow
```
Hook triggers
    ↓
MCP tool called
    ↓
External system invoked
    ↓
Result returned to Claude
```
**Components:** Hook + MCP

### Pattern 8: Plugin Distribution
```
Build components locally
    ↓
Package as plugin
    ↓
Distribute via marketplace
```
**Components:** Plugin + Any combination above

## Decision Tree: Which Pattern?

```
Is it a workflow YOU invoke directly?
├── YES → Skill (with disable-model-invocation if needed)
└── NO → Is it something Claude should do automatically?
         ├── YES → Does it need enforcement?
         │       ├── YES → Hook + optional Skill
         │       └── NO → Skill (default invocation)
         └── NO → Does it need isolation?
                 ├── YES → Subagent (fork or standalone)
                 └── NO → Is it multi-agent?
                         ├── YES → Team pattern
                         │       ├── Peer messaging → Metacog Shell
                         │       └── Shared state → World of Skillcraft
                         └── NO → CLAUDE.md + Skills
```

## Build Workflow

### Phase 1: Analyze
```
1. Read existing system files
2. Identify which primitives are already present
3. Map what's missing vs. what the goal requires
4. Choose the build pattern
```

### Phase 2: Map
```
5. Create component map:
   - Which files to create/modify
   - Which primitives connect to which
   - What the data flow looks like
```

### Phase 3: Build (Conversation by Conversation)
```
CONVERSATION 1:
  Read source files
  Create SKILL.md + resources/

CONVERSATION 2:
  Create hook definitions
  Create subagent definitions

CONVERSATION 3:
  Create MCP configurations
  Create plugin manifest

[Continue until all components built]
```

### Phase 4: Test
```
1. Test each component in isolation
2. Test component interactions
3. Test integration points
```

### Phase 5: Package
```
1. If plugin: Create plugin.json + marketplace.json
2. If distributable: Organize for sharing
```

### Phase 6: Output
```
1. GitHub (new repo or commit)
2. Install instructions
3. User testing (if plugin → user install + test)
```

## Component → File Mapping

| Component | File Location | Format |
|-----------|---------------|--------|
| Skill | `~/.claude/skills/<name>/SKILL.md` | YAML frontmatter + Markdown |
| Hook | `.claude/settings.json` or `hooks/hooks.json` | JSON |
| Subagent | `~/.claude/agents/<name>.md` | YAML frontmatter + Markdown |
| MCP | `.mcp.json` | JSON |
| Plugin | `<plugin>/.claude-plugin/plugin.json` | JSON |
| Team | Auto-created by TeamCreate | — |
| CLAUDE.md | `CLAUDE.md` in project root | Markdown |
