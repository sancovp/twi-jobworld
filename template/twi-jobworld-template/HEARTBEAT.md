Run the WORKDAY ROUND now: invoke the ceo-bootstrap skill and complete ALL its
steps, in order — 0 roster gate (bootstrap missing departments instead of ever
soloing), 1 read events, 2 review every supposedly_done task
(curl {server}/api/tasks/supposedly-done → POST /api/ceo-review), 3 assign this
round's tasks, 4 RUN the departments via the executor seam (JW_ROUND_EXECUTOR),
5 verify every department reported, 6 emit the round record.

Every heartbeat = one complete Workday round. A round may NOT end with you
having done a department's work inline.
