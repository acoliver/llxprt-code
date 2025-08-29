# Tool Call/Response Management Pseudocode

## Tool Management Implementation (Integrated into HistoryService)

**ARCHITECTURAL NOTE**: This pseudocode originally described a separate ToolManager class.
However, the architecture has been simplified - these methods are now part of HistoryService.
Tool tracking IS history management - they're the same concern.

```
10: CLASS HistoryService (Tool Management Methods)
11:   PROPERTIES:
12:     pendingToolCalls: Map<string, ToolCall>
13:     toolResponses: Map<string, ToolResponse>
14:     executionOrder: string[]
15:     maxPendingCalls: number = 50
16:     executionTimeout: number = 300000  // 5 minutes
17:     stateManager: StateManager
18:     eventEmitter: EventEmitter
19: 
20: METHOD constructor(conversationId: string)
21:   // @requirement HS-009: Initialize tool management within HistoryService
22:   SET this.pendingToolCalls = empty map
23:   SET this.toolResponses = empty map
24:   SET this.executionOrder = empty array
25:   // State and event management are part of HistoryService
26:   SET this.stateManager = internal state manager
27:   SET this.eventEmitter = internal event emitter
27: END METHOD
28: 
29: METHOD addPendingToolCalls(calls: ToolCall[])
30:   // @requirement HS-009: Add pending tool calls
31:   BEGIN TRANSACTION
32:   TRY
33:     CALL this.stateManager.validateStateTransition(ADD_TOOL_CALLS)
34:     VALIDATE calls is array and not empty
35:     IF not Array.isArray(calls) OR calls.length is 0
36:       THROW ValidationError("Tool calls must be a non-empty array")
37:     END IF
38:     IF this.pendingToolCalls.size + calls.length > this.maxPendingCalls
39:       THROW ValidationError("Too many pending tool calls (max: " + this.maxPendingCalls + ")")
40:     END IF
41:     FOR each call in calls
42:       CALL this.validateToolCall(call)
43:       IF this.pendingToolCalls.has(call.id)
44:         THROW ValidationError("Tool call ID already exists: " + call.id)
45:       END IF
46:       SET this.pendingToolCalls.set(call.id, call)
47:       ADD call.id to this.executionOrder
48:     END FOR
49:     CALL this.stateManager.transitionTo(TOOLS_PENDING, {
50:       toolCalls: calls,
51:       triggeredBy: "addPendingToolCalls"
52:     })
53:     EMIT ToolCallsAdded event with calls
54:     COMMIT TRANSACTION
55:     RETURN calls.length
56:   CATCH error
57:     ROLLBACK TRANSACTION
58:     EMIT ToolCallsAddError event with error
59:     THROW error
60:   END TRY
61: END METHOD
62: 
63: METHOD executeToolCalls()
64:   // @requirement HS-010: Execute pending tool calls
65:   BEGIN TRANSACTION
66:   TRY
67:     CALL this.stateManager.validateStateTransition(EXECUTE_TOOLS)
68:     IF this.pendingToolCalls.size is 0
69:       THROW StateError("No pending tool calls to execute")
70:     END IF
71:     CALL this.stateManager.transitionTo(TOOLS_EXECUTING, {
72:       toolCallsCount: this.pendingToolCalls.size,
73:       triggeredBy: "executeToolCalls"
74:     })
75:     SET executionResults = empty array
76:     SET startTime = currentTimestamp()
77:     FOR each callId in this.executionOrder
78:       GET toolCall = this.pendingToolCalls.get(callId)
79:       IF toolCall exists
80:         TRY
81:           SET result = CALL this.executeSingleToolCall(toolCall)
82:           ADD result to executionResults
83:         CATCH execution error
84:           SET errorResult = CREATE error result for toolCall with error
85:           ADD errorResult to executionResults
86:           LOG "Tool call execution failed: " + callId + " - " + error.message
87:         END TRY
88:       END IF
89:       IF currentTimestamp() - startTime > this.executionTimeout
90:         THROW TimeoutError("Tool execution timeout exceeded")
91:       END IF
92:     END FOR
93:     EMIT ToolCallsExecuted event with executionResults
94:     COMMIT TRANSACTION
95:     RETURN executionResults
96:   CATCH error
97:     ROLLBACK TRANSACTION
98:     CALL this.stateManager.transitionTo(ERROR, {
99:       error: error,
100:       triggeredBy: "executeToolCalls"
101:     })
102:     EMIT ToolExecutionError event with error
103:     THROW error
104:   END TRY
105: END METHOD
106: 
107: METHOD addToolResponses(responses: ToolResponse[])
108:   // @requirement HS-011: Add tool responses
109:   BEGIN TRANSACTION
110:   TRY
111:     CALL this.stateManager.validateStateTransition(ADD_TOOL_RESPONSES)
112:     VALIDATE responses is array and not empty
113:     IF not Array.isArray(responses) OR responses.length is 0
114:       THROW ValidationError("Tool responses must be a non-empty array")
115:     END IF
116:     FOR each response in responses
117:       CALL this.validateToolResponse(response)
118:       IF not this.pendingToolCalls.has(response.toolCallId)
119:         THROW ValidationError("Tool response has no matching call: " + response.toolCallId)
120:       END IF
121:       IF this.toolResponses.has(response.toolCallId)
122:         THROW ValidationError("Tool response already exists for call: " + response.toolCallId)
123:       END IF
124:       SET this.toolResponses.set(response.toolCallId, response)
125:     END FOR
126:     EMIT ToolResponsesAdded event with responses
127:     COMMIT TRANSACTION
128:     RETURN responses.length
129:   CATCH error
130:     ROLLBACK TRANSACTION
131:     EMIT ToolResponsesAddError event with error
132:     THROW error
133:   END TRY
134: END METHOD
135: 
136: METHOD completeToolExecution()
137:   // @requirement HS-012: Complete tool execution cycle
138:   BEGIN TRANSACTION
139:   TRY
140:     CALL this.stateManager.validateStateTransition(COMPLETE_TOOLS)
141:     SET completedCalls = empty array
142:     SET pendingCalls = empty array
143:     FOR each callId in this.executionOrder
144:       IF this.toolResponses.has(callId)
145:         GET toolCall = this.pendingToolCalls.get(callId)
146:         GET toolResponse = this.toolResponses.get(callId)
147:         ADD { call: toolCall, response: toolResponse } to completedCalls
148:       ELSE
149:         GET toolCall = this.pendingToolCalls.get(callId)
150:         ADD toolCall to pendingCalls
151:       END IF
152:     END FOR
153:     IF pendingCalls.length > 0
154:       LOG "Warning: " + pendingCalls.length + " tool calls completed without responses"
155:     END IF
156:     CALL this.stateManager.transitionTo(TOOLS_COMPLETED, {
157:       completedCalls: completedCalls.length,
158:       pendingCalls: pendingCalls.length,
159:       triggeredBy: "completeToolExecution"
160:     })
161:     EMIT ToolExecutionCompleted event with {
162:       completedCalls: completedCalls,
163:       pendingCalls: pendingCalls
164:     }
165:     COMMIT TRANSACTION
166:     RETURN {
167:       completed: completedCalls.length,
168:       pending: pendingCalls.length
169:     }
170:   CATCH error
171:     ROLLBACK TRANSACTION
172:     EMIT ToolExecutionCompleteError event with error
173:     THROW error
174:   END TRY
175: END METHOD
176: 
177: METHOD clearToolState()
178:   // @requirement HS-013: Clear tool state
179:   BEGIN TRANSACTION
180:   TRY
181:     IF this.stateManager.getCurrentState() is TOOLS_EXECUTING
182:       THROW StateError("Cannot clear tool state during execution")
183:     END IF
184:     STORE pendingCount = this.pendingToolCalls.size
185:     STORE responseCount = this.toolResponses.size
186:     SET this.pendingToolCalls = empty map
187:     SET this.toolResponses = empty map
188:     SET this.executionOrder = empty array
189:     CALL this.stateManager.transitionTo(READY, {
190:       clearedPending: pendingCount,
191:       clearedResponses: responseCount,
192:       triggeredBy: "clearToolState"
193:     })
194:     EMIT ToolStateCleared event with {
195:       pendingCount: pendingCount,
196:       responseCount: responseCount
197:     }
198:     COMMIT TRANSACTION
199:     RETURN {
200:       pendingCleared: pendingCount,
201:       responsesCleared: responseCount
202:     }
203:   CATCH error
204:     ROLLBACK TRANSACTION
205:     EMIT ToolStateClearError event with error
206:     THROW error
207:   END TRY
208: END METHOD
209: 
210: METHOD getToolCallStatus()
211:   // @requirement HS-014: Get tool call status
212:   INITIALIZE status = empty object
213:   SET status.pendingCalls = this.pendingToolCalls.size
214:   SET status.responseCount = this.toolResponses.size
215:   SET status.currentState = this.stateManager.getCurrentState()
216:   SET status.completedCalls = 0
217:   SET status.failedCalls = 0
218:   FOR each [callId, response] in this.toolResponses
219:     IF response.error
220:       INCREMENT status.failedCalls
221:     ELSE
222:       INCREMENT status.completedCalls
223:     END IF
224:   END FOR
225:   SET status.executionOrder = copy of this.executionOrder
226:   SET status.details = empty array
227:   FOR each callId in this.executionOrder
228:     GET toolCall = this.pendingToolCalls.get(callId)
229:     GET toolResponse = this.toolResponses.get(callId)
230:     ADD to status.details: {
231:       callId: callId,
232:       functionName: toolCall?.function?.name,
233:       hasResponse: toolResponse != null,
234:       responseStatus: toolResponse?.error ? "error" : "success",
235:       timestamp: toolCall?.timestamp
236:     }
237:   END FOR
238:   RETURN status
239: END METHOD
240: 
241: METHOD validateToolCall(toolCall: ToolCall)
242:   // Helper method to validate tool call structure
243:   IF toolCall is null or undefined
244:     THROW ValidationError("Tool call cannot be null or undefined")
245:   END IF
246:   IF not toolCall.id
247:     THROW ValidationError("Tool call must have an ID")
248:   END IF
249:   IF typeof toolCall.id is not string
250:     THROW ValidationError("Tool call ID must be a string")
251:   END IF
252:   IF not toolCall.function
253:     THROW ValidationError("Tool call must have a function")
254:   END IF
255:   IF not toolCall.function.name
256:     THROW ValidationError("Tool call function must have a name")
257:   END IF
258:   IF toolCall.function.arguments AND typeof toolCall.function.arguments is not string
259:     THROW ValidationError("Tool call function arguments must be a string")
260:   END IF
261:   RETURN true
262: END METHOD
263: 
264: METHOD validateToolResponse(toolResponse: ToolResponse)
265:   // Helper method to validate tool response structure
266:   IF toolResponse is null or undefined
267:     THROW ValidationError("Tool response cannot be null or undefined")
268:   END IF
269:   IF not toolResponse.toolCallId
270:     THROW ValidationError("Tool response must have a tool call ID")
271:   END IF
272:   IF typeof toolResponse.toolCallId is not string
273:     THROW ValidationError("Tool response tool call ID must be a string")
274:   END IF
275:   IF not toolResponse.content AND not toolResponse.error
276:     THROW ValidationError("Tool response must have either content or error")
277:   END IF
278:   IF toolResponse.content AND toolResponse.error
279:     THROW ValidationError("Tool response cannot have both content and error")
280:   END IF
281:   RETURN true
282: END METHOD
283: 
284: METHOD executeSingleToolCall(toolCall: ToolCall)
285:   // Helper method to execute a single tool call
286:   SET startTime = currentTimestamp()
287:   TRY
288:     LOG "Executing tool call: " + toolCall.id + " - " + toolCall.function.name
289:     // This would integrate with actual tool execution system
290:     SET result = CALL externalToolExecutor.execute(toolCall)
291:     SET endTime = currentTimestamp()
292:     RETURN {
293:       toolCallId: toolCall.id,
294:       result: result,
295:       executionTime: endTime - startTime,
296:       status: "success"
297:     }
298:   CATCH execution error
299:     SET endTime = currentTimestamp()
300:     RETURN {
301:       toolCallId: toolCall.id,
302:       error: error.message,
303:       executionTime: endTime - startTime,
304:       status: "error"
305:     }
306:   END TRY
307: END METHOD
308: 
309: METHOD getPendingToolCall(toolCallId: string)
310:   // Get specific pending tool call
311:   VALIDATE toolCallId is not empty
312:   GET toolCall = this.pendingToolCalls.get(toolCallId)
313:   IF not toolCall
314:     THROW NotFoundError("Pending tool call not found: " + toolCallId)
315:   END IF
316:   RETURN toolCall
317: END METHOD
318: 
319: METHOD getToolResponse(toolCallId: string)
320:   // Get specific tool response
321:   VALIDATE toolCallId is not empty
322:   GET toolResponse = this.toolResponses.get(toolCallId)
323:   IF not toolResponse
324:     THROW NotFoundError("Tool response not found: " + toolCallId)
325:   END IF
326:   RETURN toolResponse
327: END METHOD
328: 
329: METHOD getAllPendingToolCalls()
330:   // Get all pending tool calls in execution order
331:   SET results = empty array
332:   FOR each callId in this.executionOrder
333:     GET toolCall = this.pendingToolCalls.get(callId)
334:     IF toolCall exists
335:       ADD toolCall to results
336:     END IF
337:   END FOR
338:   RETURN results
339: END METHOD
340: 
341: METHOD getAllToolResponses()
342:   // Get all tool responses in execution order
343:   SET results = empty array
344:   FOR each callId in this.executionOrder
345:     GET toolResponse = this.toolResponses.get(callId)
346:     IF toolResponse exists
347:       ADD toolResponse to results
348:     END IF
349:   END FOR
350:   RETURN results
351: END METHOD
352: 
353: END CLASS  // HistoryService with integrated tool management

## Architectural Simplification Note

The above pseudocode has been adapted from a separate ToolManager class to be methods
directly within HistoryService. This architectural decision:

1. **Prevents orphaned tools** through unified state management
2. **Simplifies the architecture** with one less abstraction layer
3. **Maintains consistency** as tool calls ARE history events
4. **Clear separation of concerns**:
   - CoreToolScheduler: Executes tools (infrastructure)
   - Turn: Orchestrates flow
   - HistoryService: Records everything (including tools)

When implementing, replace all "ToolManager" references with "HistoryService".
```