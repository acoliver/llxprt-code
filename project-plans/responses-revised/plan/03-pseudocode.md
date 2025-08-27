# Phase 03: Pseudocode Development

## Phase ID
`PLAN-20250826-RESPONSES.P03`

## Task Description

Create detailed, numbered pseudocode for all components that need modification. This pseudocode will be referenced line-by-line during implementation phases.

## Input Files

- `/project-plans/responses-revised/specification.md`
- `/project-plans/responses-revised/analysis/domain-model.md`

## Output Files

Create the following pseudocode files:

### 1. `/project-plans/responses-revised/analysis/pseudocode/provider-update.md`

```
10: METHOD generateChatCompletion(contents, tools, toolFormat, sessionId)
11:   // OpenAIProvider implementation
12:   IF this.shouldUseResponses(model) THEN
13:     previousResponseId = CALL findPreviousResponseId(contents)
14:     conversationId = sessionId OR generateTempId()
15:     request = CALL buildResponsesRequest(contents, options, conversationId, previousResponseId)
16:     stream = CALL fetch(responsesEndpoint, request)
17:     YIELD* parseResponsesStream(stream)
18:   ELSE
19:     // Regular OpenAI models ignore sessionId
20:     YIELD* callRegularEndpoint(contents, options)
21:   END IF
22: END METHOD

23: METHOD findPreviousResponseId(contents)
24:   FOR i FROM contents.length - 1 TO 0 STEP -1
25:     IF contents[i].role IN ['assistant', 'model'] THEN
26:       IF contents[i].metadata?.responseId EXISTS THEN
27:         RETURN contents[i].metadata.responseId
28:       END IF
29:     END IF
30:   END FOR
31:   RETURN null
32: END METHOD
```

### 2. `/project-plans/responses-revised/analysis/pseudocode/parser-update.md`

```
40: ASYNC GENERATOR parseResponsesStream(stream)
41:   WHILE stream has events
42:     event = PARSE next event from stream
43:     
44:     IF event.type == 'response.completed' THEN
45:       responseId = event.response.id
46:       content = CREATE Content object
47:       content.role = 'model'
48:       content.parts = []
49:       content.metadata = { responseId: responseId }
50:       YIELD content
51:     
52:     ELSE IF event.type == 'content.part.delta' THEN
53:       content = CREATE Content object
54:       content.role = 'model'
55:       content.parts = [{ text: event.delta.text }]
56:       YIELD content
57:     END IF
58:   END WHILE
59: END GENERATOR
```

### 3. `/project-plans/responses-revised/analysis/pseudocode/integration.md`

```
70: // ContentGenerator or ProviderContentGenerator update
71: METHOD generateContent(provider, contents, tools, toolFormat)
72:   sessionId = this.context.sessionId OR this.sessionId
73:   
74:   // Pass sessionId to provider
75:   YIELD* provider.generateChatCompletion(
76:     contents,
77:     tools,
78:     toolFormat,
79:     sessionId  // NEW parameter
80:   )
81: END METHOD

82: // IMessage removal process
83: PROCEDURE removeIMessage()
84:   files = FIND all files importing IMessage
85:   FOR EACH file IN files
86:     REPLACE IMessage imports with Content imports
87:     UPDATE type annotations from IMessage to Content
88:     VERIFY TypeScript compilation
89:   END FOR
90:   DELETE packages/core/src/providers/IMessage.ts
91: END PROCEDURE
```

## Requirements

- Every line must be numbered
- Use clear algorithmic steps
- Include error handling
- No actual TypeScript code
- Cover all requirements from specification

## Success Criteria

- Pseudocode covers all modifications needed
- Line numbers sequential and clear
- All error paths defined
- Integration points documented
- Can be traced to requirements

## Execution Instructions

```bash
# For subagent execution:
Read the domain analysis and specification.
Create numbered pseudocode for each component.
Ensure every step is clear and traceable.
DO NOT write TypeScript, only pseudocode.
Include error handling paths.
```

## Phase Markers

Every pseudocode file must include:
```markdown
<!-- @plan PLAN-20250826-RESPONSES.P03 -->
<!-- @requirement REQ-XXX -->
<!-- Line numbers will be referenced in implementation phases -->
```