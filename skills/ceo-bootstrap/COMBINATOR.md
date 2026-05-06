# Team Config Combinator

How to run multiple department teams as one combined team.

## The Problem

When multiple departments need to work together in a round, you cannot run them as separate teams. They must be combined into ONE team with ONE config.

## The Solution

Merge the team configs of all required departments into a single combined config.

## Team Config Structure

```json
{
  "name": "department-name",
  "description": "Department description",
  "createdAt": 1234567890,
  "leadAgentId": "team-lead@team-name",
  "leadSessionId": "session-id",
  "members": [
    {
      "agentId": "agent-id",
      "name": "agent-name",
      "agentType": "general-purpose",
      "model": "claude-sonnet-4-6",
      "joinedAt": 1234567890,
      "tmuxPaneId": "",
      "cwd": "/path/to/working/dir",
      "subscriptions": []
    }
  ]
}
```

## How to Combine

1. **Read each department's team config**
   - Department configs are in their skill directories at `~/.claude/skills/{dept-name}/SKILL.md`

2. **Extract the members array from each config**

3. **Merge all members into one array**
   - Combine all member objects from all department configs
   - Ensure each member has unique agentId

4. **Create combined config**
   ```json
   {
     "name": "combined-team",
     "description": "Combined team of all departments for this round",
     "members": [/* all members from all departments */]
   }
   ```

5. **Run the combined team**
   - Use TeamCreate with the combined config
   - Or spawn agents directly with the merged member list

## Example

If research-dept has members [A, B] and sales-dept has members [C, D], the combined team has members [A, B, C, D].

## Important

- The combined team runs all departments simultaneously
- Each agent follows their own department's skill
- They communicate via the event server (POST to http://localhost:3847/api/emit-event)
- The event stream shows what each department agent is doing
