# Pseudocode: Parser Update

<!-- @plan PLAN-20250826-RESPONSES.P03 -->
<!-- @requirement REQ-002 -->
<!-- Line numbers will be referenced in implementation phases -->

## parseResponsesStream Method Update

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

## Extended Stream Event Handling

```
60: METHOD parseStreamEvent(eventData)
61:   // REQ-002.1: Extract response ID from API response.completed event
62:   IF eventData.type == 'response.completed' THEN
63:     IF eventData.response?.id EXISTS THEN
64:       // REQ-002.2: Add responseId to Content metadata before yielding
65:       RETURN createContentWithMetadata(eventData.response.id)
66:     ELSE
67:       THROW Error("Missing response.id in response.completed event")
68:     END IF
69:   
70:   ELSE IF eventData.type == 'content.part.delta' THEN
71:     // REQ-003.2: Convert parseResponsesStream to return Content[] not IMessage
72:     RETURN createContentFromDelta(eventData.delta)
73:   
74:   ELSE IF eventData.type == 'tool_call.start' THEN
75:     RETURN createContentFromToolStart(eventData.tool_call)
76:   
77:   ELSE IF eventData.type == 'tool_call.delta' THEN
78:     RETURN createContentFromToolDelta(eventData.tool_call)
79:   
80:   ELSE IF eventData.type == 'error' THEN
81:     THROW Error("API error: " + eventData.error.message)
82:   
83:   ELSE
84:     // Unknown event type - log but don't break stream
85:     LOG("Unknown event type: " + eventData.type)
86:     RETURN null
87:   END IF
88: END METHOD

89: METHOD createContentWithMetadata(responseId)
90:   // REQ-003.3: Add metadata field to returned Content
91:   content = CREATE Content object
92:   content.role = 'model'
93:   content.parts = []  // Empty parts for metadata-only content
94:   content.metadata = { responseId: responseId }
95:   RETURN content
96: END METHOD

97: METHOD createContentFromDelta(delta)
98:   // REQ-003.4: Preserve existing Content structure
99:   content = CREATE Content object
100:  content.role = 'model'
101:  content.parts = [{ text: delta.text }]
102:  // No metadata for delta events
103:  RETURN content
104: END METHOD
```

## Error Handling for Stream Processing

```
105: METHOD handleStreamError(error, stream)
106:   IF error.type == 'network_error' THEN
107:     THROW Error("Network error during stream processing: " + error.message)
108:   
109:   ELSE IF error.type == 'parse_error' THEN
110:     LOG("Failed to parse stream event, skipping: " + error.data)
111:     // Continue processing, don't break entire stream
112:     RETURN null
113:   
114:   ELSE IF error.type == 'api_error' THEN
115:     THROW Error("OpenAI API error: " + error.message)
116:   
117:   ELSE
118:     THROW Error("Unknown stream error: " + error.message)
119:   END IF
120: END METHOD

121: METHOD validateStreamEvent(event)
122:   IF event IS null OR event IS undefined THEN
123:     RETURN false
124:   END IF
125:   IF event.type IS undefined THEN
126:     LOG("Event missing type field")
127:     RETURN false
128:   END IF
129:   RETURN true
130: END METHOD
```