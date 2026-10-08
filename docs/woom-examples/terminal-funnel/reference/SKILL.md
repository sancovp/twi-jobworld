---
name: terminal-funnel
description: When building gamified terminal-based application funnels for communities. Creates fake CLI interfaces with easter egg hunts that capture leads, test domain knowledge, and generate social proof. Use when user wants a "Claude Community style" signup, terminal-based lead capture, or gamified waitlist.
---

# Terminal Funnel Builder

## What You're Building

A simulated terminal that:
1. Captures lead info (email first, then explore)
2. Hides 16 easter eggs triggered by CLI commands
3. Creates artificial scarcity ("at capacity")
4. Generates screenshot-worthy victory screens

## Core Flow

```
Welcome → Form (email capture) → "Thank you + explore hint" → 
Easter egg hunt → Unlock threshold (6) → "Qualified but waitlisted" →
Continue hunting → Elite (16/16) → Victory screen + share CTA
```

## The 16 Standard Achievements

| Command | Achievement | Tests |
|---------|-------------|-------|
| `help` | Helper | RTFM |
| `ls` | Explorer | Navigation |
| `ls -la` | Hidden Seeker | Dotfiles |
| `cat [file]` | File Reader | File ops |
| `cat .[hidden]` | Secret Hunter | Config digging |
| `cd [dir]` | Navigator | Directory traversal |
| `sudo` | Super User | Privilege awareness |
| `Ctrl+C` | Interruptor | Process control |
| `clear` | Clean Slate | Terminal hygiene |
| `history` | Time Traveler | Shell history |
| `whoami` | Self Aware | Identity |
| `pwd` | Path Finder | Location |
| `vim`/`nano` | Editor Wars | Editor knowledge |
| `grep` | Pattern Matcher | Search |
| `man` | Manual Reader | Docs |
| `[custom]` | [Product] Whisperer | Product knowledge |

Adapt names/descriptions to domain (meditation, business, dev, etc.)

## File System Structure

```
/home/user/
├── [community]/
│   ├── README.md          # Welcome + hints
│   ├── [script].sh        # Runnable easter egg
│   ├── requirements.txt   # Domain requirements
│   ├── .[config]rc        # Hidden config with SECRET_COMMAND hint
│   └── .secrets/
│       └── [key].txt      # Deep discovery
├── .bashrc                # Alias hints (non-functional)
└── .profile               # Red herring (unreadable)
```

## Key Patterns

**Velvet Rope**: Even at 100%, "at capacity" - nobody gets instant access. It's a pre-launch email capture.

**Social Proof Generation**: Victory screen + explicit screenshot CTA + hashtag + handle = free distribution.

**Self-Selection**: Only target audience completes. The puzzle IS the qualification.

**Hint Layering**: Obvious → Subtle → Hidden. `help` tells you basics. `.bashrc` hints at secrets. `.secrets/.do-not-open` rewards reverse psychology.

## Implementation Checklist

- [ ] ASCII art header (figlet block style)
- [ ] Form capture BEFORE exploration
- [ ] 16 achievement triggers
- [ ] State persistence (localStorage)
- [ ] Status bar updates (Skill Level: N)
- [ ] Progress messaging at thresholds
- [ ] `[custom] --unlock` progress check
- [ ] `[custom] join --force` qualification screen
- [ ] Victory screen with all achievements listed
- [ ] Screenshot CTA with hashtag

## The Funnel Algebra

A terminal funnel is a function: `F(Domain, Audience, Scarcity) → Qualified Leads + Social Proof`

### Variables

| Symbol | Meaning | Examples |
|--------|---------|----------|
| `D` | Domain/Topic | dev tools, meditation, business, AI |
| `A` | Target Audience | developers, founders, creators |
| `S` | Scarcity Frame | "at capacity", "invite-only", "founding members" |
| `K` | Knowledge Gates | commands that prove domain expertise |
| `R` | Reward Tiers | thresholds that unlock status (6/16, 16/16) |
| `V` | Viral Hooks | screenshot CTA, hashtag, share prompt |

### The Formula

```
FUNNEL = {
  CAPTURE(email) →
  CHALLENGE(K₁...K₁₆) →
  GATE(R_threshold) →
  REWARD(S + V)
}
```

Where:
- `K` maps to audience knowledge (CLI for devs, mindfulness for meditators)
- `R` creates progression dopamine (skill level increasing)
- `S` creates urgency without lying (always "waitlisted")
- `V` turns completers into distributors

### Core Invariants

1. **Capture before play** - Email is non-negotiable entry fee
2. **Knowledge = Qualification** - Wrong audience self-selects out
3. **Everyone waits** - No instant access, maintains mystique
4. **Victory = Distribution** - Every winner becomes a marketer

---

## Real Examples

### Claude Community (Dev/AI)

**Launch tweets:**
> "I want to start a community dedicated to Claude Code. It's become the gateway drug to coding and experiencing the power of AI for tons of people. This will be a space for people to share killer use cases, agentic workflows, proven prompts, and connect with other CC obsessives. Comment 'Claude' if you want to join."

> "Claude Community is officially live! If you'd like to join apply here: https://claudecode.community. One of the sickest applications I've ever seen. You'll see why."

**Config:**
```javascript
D = "Claude Code / AI coding"
A = "developers using Claude Code"
S = "community at capacity"
K = {
  // Standard CLI (proves dev background)
  help, ls, cat, cd, pwd, sudo, vim, grep, man, clear, history, whoami,
  // Domain-specific
  "claude --help",    // knows the tool
  "mcp",              // knows advanced features
  "/init"             // knows slash commands
}
V = { hashtag: "#ClaudeCommunity", handle: "@handle" }
```

**Why it works:** Claude Code users ARE developers. CLI commands are native. The funnel feels like home, not a gimmick.

---

### SANCTUM (Meditation/Spiritual)

**Config:**
```javascript
D = "meditation / inner work"
A = "spiritual seekers, meditators"
S = "sanctuary at capacity"
K = {
  // Reframed CLI as contemplative actions
  "look",        // observation (ls)
  "breathe",     // presence (clear)
  "sit",         // stillness (wait)
  "listen",      // attention (cat)
  "walk",        // movement (cd)
  "reflect",     // introspection (history)
  "ask",         // inquiry (help)
  "surrender",   // letting go (sudo)
  "witness",     // awareness (whoami)
  "release",     // non-attachment (rm)
  "return",      // coming back (cd ~)
  "om",          // sacred sound (custom)
  "mantra",      // repetition
  "mudra",       // gesture
  "dharma",      // teaching (man)
  "sangha"       // community (custom --unlock)
}
V = { hashtag: "#SANCTUM", cta: "Share your journey" }
```

**Why it works:** Reframes terminal as meditation UI. Commands become contemplative verbs. Audience self-selects by recognizing spiritual vocabulary.

---

### PAIAB (Paid As I Am Business)

**Config:**
```javascript
D = "premium business / pricing"
A = "founders, consultants, freelancers"
S = "founding member spots limited"
K = {
  // Business CLI metaphors
  "price",       // core action
  "scope",       // project definition
  "pitch",       // sales
  "close",       // deal-making
  "invoice",     // getting paid
  "follow-up",   // persistence
  "qualify",     // lead filtering
  "negotiate",   // deal terms
  "value",       // worth assessment
  "position",    // market stance
  "audit",       // review (ls -la)
  "pivot",       // change direction
  "scale",       // growth
  "delegate",    // sudo equivalent
  "paiab",       // product command
  "premium"      // unlock command
}
V = { hashtag: "#PaidAsIAm", handle: "@founder" }
```

**Why it works:** Business vocabulary as commands. Only people who think in these terms will complete it. Filters for pricing-confident founders.

---

## Domain Adaptation Guide

### Step 1: Identify Knowledge Markers
What does your audience know that others don't?
- Developers → CLI commands, git, vim jokes
- Meditators → practice terms, traditions, teachers
- Founders → business metrics, funding stages, growth terms

### Step 2: Map to Command Structure
```
[verb] [object] [flags]
```
- Dev: `git commit -m "message"`
- Meditation: `breathe deep --count=10`
- Business: `price premium --confidence`

### Step 3: Create Hint Layers
```
Layer 1 (Obvious):    help, start, begin
Layer 2 (Standard):   domain-specific basics
Layer 3 (Hidden):     .[dotfiles], secrets/, obscure commands
Layer 4 (Elite):      [product] --unlock, join --force
```

### Step 4: Craft Victory Copy
The screenshot must include:
- Clear achievement (16/16, ELITE STATUS)
- Scarcity reinforcement ("you qualified but...")
- Explicit share CTA ("Screenshot this!")
- Hashtag + handle for attribution

---

## Exit Condition

Complete when:
- Single HTML file works end-to-end
- All 16 achievements trigger correctly
- Form submits to backend
- Victory screen renders cleanly for screenshots
- Domain vocabulary feels native to target audience
