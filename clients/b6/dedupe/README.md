# B6 — dedupe lists (data; the exclusion lists)

**Hard rule (SPEC §2, §10):** the general engine must NEVER send to a brand that
sits in one of Avi's active manual pipelines. Scrub against these before every
send. The manual campaigns are the rifle; the engine is the radar — they must
not collide.

## Expected lists (CSV, one brand/domain per row)

| file | pipeline |
|---|---|
| `surviving-the-cows.csv` | Surviving the Cows (STC) named targets |
| `trashed.csv` | Trashed named targets |
| `7-stories.csv` | 7 Stories named targets |

`NEEDS-FROM-AVI:` the actual CSVs. Until provided, the engine has no exclusion
data and must not run a live send for B6.

## How dedupe is applied (NOT a code linter)

The skip-list is **instruction data**, not a connector verb. The source/deliver
skill loads these lists and the worker excludes any matching brand/domain before
sending. (If a list ever grows too large to hold in context, it becomes a
connector lookup — but that is a function only because membership-at-scale must
execute, not because "checking a string" needs code.)

Also excluded by rule, not by list: the primary domain **b6studios.com** is never
a sending domain and never a target.
