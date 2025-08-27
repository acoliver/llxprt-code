# Pseudocode: Provider Update

<!-- @plan PLAN-20250826-RESPONSES.P03 -->
<!-- @requirement REQ-001 -->
<!-- Line numbers will be referenced in implementation phases -->

## OpenAI Provider generateChatCompletion Method Update

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

## Error Handling and Edge Cases

```
33: METHOD generateTempId()
34:   // REQ-001.5: Generate temporary ID if sessionId not provided  
35:   timestamp = getCurrentTimestamp()
36:   randomPart = generateCryptoRandom(8)
37:   RETURN "temp_" + timestamp + "_" + randomPart
38: END METHOD

39: METHOD validateSessionId(sessionId)
40:   IF sessionId IS NULL OR sessionId IS undefined THEN
41:     RETURN true  // Optional parameter, can be null
42:   END IF
43:   IF typeof sessionId !== 'string' THEN
44:     THROW TypeError("sessionId must be string or null")
45:   END IF
46:   IF sessionId.length > 256 THEN
47:     THROW Error("sessionId too long")
48:   END IF
49:   RETURN true
50: END METHOD

51: METHOD handleProviderSwitch(contents)
52:   // REQ-INT-001.4: Provider switching works correctly
53:   // When switching providers, previous_response_id should be null
54:   // because new provider can't continue previous provider's conversation
55:   RETURN null
56: END METHOD
```