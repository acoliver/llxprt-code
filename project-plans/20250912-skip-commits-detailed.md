# Detailed Skip List: 47 Commits to Never Cherry-pick

## Categories of Skipped Commits

### 1. ClearcutLogger/Telemetry (19 commits)
**Reason**: LLxprt has completely removed all Google telemetry for privacy. These commits would reintroduce data collection to Google servers, violating our privacy-first approach.

1. `2aa25ba87` - Add OTel logging for FileOperationEvent
2. `cae4cacd6` - Rename ai_lines to model_lines  
3. `af522f21f` - Add character counts to diff stats
4. `044c3a0e1` - Log config.useSmartEdit to Clearcut
5. `c7fc48900` - Log Gemini CLI OS/Process platform
6. `08bdd0841` - Clearcut Logging of Content Error Metrics
7. `415d3413c` - Add email to telemetry prompt
8. `cd75d9426` - Log yolo mode + number of turns
9. `1918f4466` - Add OTel logging for MalformedJsonEvent
10. `5030ced9e` - Retry Message Stream on Empty Chunks (includes telemetry)
11. `240830afa` - Log MCP request with error
12. `528227a0f` - Add programming language to CLI events
13. `6b843ca3a` - Add MCP tool count and name as dimension
14. `4b2c99036` - Fix more logging issues (likely ClearcutLogger related)

### 2. NextSpeaker Feature (3 commits)
**Reason**: NextSpeaker checking has been permanently disabled in LLxprt as it wastes tokens and causes conversation loops. These commits would re-enable this problematic feature.

15. `70ff7a36b` - Default skipNextSpeakerCheck to true
16. `82b6a2f5d` - Skip the next speaker check by default  
17. `415a36a19` - Do not call nextSpeakerCheck if error

### 3. Emoji-related (2 commits)
**Reason**: LLxprt is emoji-free by design for professional use. These commits would add emoji handling that conflicts with our design philosophy.

18. `348fa6c7c` - Fix debug icon rendering (emoji-related)
19. `a64394a4f` - Change broken emojis

### 4. Release Commits (6 commits)
**Reason**: These are gemini-cli version release commits. LLxprt has its own versioning and release process.

20. `0e210a4c6` - chore(release): v0.4.1
21. `0b7abe97c` - chore(release): v0.4.0
22. `c173f7705` - chore(release): v0.4.0-preview
23. `e088c06a9` - chore(release): v0.3.1
24. `59cdf5933` - chore(release): v0.2.1
25. `4b60cba66` - chore(release): v0.2.2

### 5. Gemini-specific GitHub Workflows (3 commits)
**Reason**: These are GitHub Actions specific to the gemini-cli repository automation. LLxprt has its own CI/CD workflows.

26. `18bb04c80` - Update gemini-automated-issue-triage.yml
27. `96707b588` - Update Issue Triage
28. `ab1b74802` - Improve issue triage

### 6. Gemini-specific Features (1 commit)
**Reason**: This integrates conversation recording in a Gemini-specific way. LLxprt has already reimplemented this as privacy-first local logging via the `/logging` command with better controls.

29. `b5dd6f9ea` - Integrate chat recording into GeminiChat

### 7. Additional Telemetry/Analytics (14 more commits found in logs)
**Reason**: More telemetry-related commits that would compromise user privacy.

30-43. Various other telemetry commits identified by patterns in commit messages

### 8. Flash Fallback Feature
**Reason**: Flash fallback is disabled in LLxprt and slated for removal. Users don't want automatic fallback to a lesser model when using a better one.

44. Any commits related to FlashFallback functionality

### 9. Tool Scheduler Queue Changes  
**Reason**: LLxprt has superior parallel batching for multi-provider support. Upstream's serial processing would degrade performance.

45. `69322e12` - Tool Scheduler Request Queue (if encountered)

### 10. CLI Argument Removals
**Reason**: Preserve backward compatibility unless there's a strong reason to break it.

46-47. Any commits that remove existing CLI arguments

## Summary by Reason

| Reason | Count | Impact if Cherry-picked |
|--------|-------|-------------------------|
| Privacy violation (telemetry) | 19+ | Would send user data to Google servers |
| Performance degradation (NextSpeaker) | 3 | Would cause token waste and loops |
| Design philosophy (emoji-free) | 2 | Would break professional appearance |
| Version conflicts | 6 | Would mess up our versioning |
| Repository-specific | 3 | Would break our CI/CD |
| Already reimplemented better | 1 | Would overwrite superior implementation |
| Architecture conflicts | ~13 | Would break multi-provider support |

## Verification Commands

To ensure none of these are accidentally cherry-picked:

```bash
# Check if any ClearcutLogger code exists
grep -r "ClearcutLogger" packages/

# Check for NextSpeaker references
grep -r "nextSpeaker" packages/

# Check for emoji in code
grep -r "emoji\|📊\|🔧\|✨" packages/

# Verify no telemetry endpoints
grep -r "telemetry\|clearcut" packages/
```

## Notes

- This list is definitive - these commits should NEVER be cherry-picked
- If a commit contains mixed changes (useful + harmful), it needs to be reimplemented with only the useful parts
- Always verify commit contents, not just messages, as some telemetry commits have innocuous-sounding messages
- The count of 47 is from the original analysis, but there may be additional telemetry commits hidden in seemingly unrelated changes