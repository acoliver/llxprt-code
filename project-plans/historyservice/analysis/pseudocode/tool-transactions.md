# Tool Transaction Pseudocode

## Core Transaction Manager

```pseudocode
1. CLASS ToolTransaction:
2.     properties:
3.         id: string
4.         assistantMessage: Message | null
5.         toolCalls: Map<string, ToolCall>
6.         toolResponses: Map<string, ToolResponse>
7.         state: 'pending' | 'committed' | 'rolledback'
8.         createdAt: timestamp
9.         
10. CLASS HistoryService:
11.     properties:
12.         messages: Message[]
13.         activeTransaction: ToolTransaction | null
14.         transactionHistory: ToolTransaction[]
15.         
16. FUNCTION beginToolTransaction():
17.     IF activeTransaction != null:
18.         THROW "Transaction already in progress"
19.     activeTransaction = new ToolTransaction()
20.     activeTransaction.id = generateId()
21.     activeTransaction.state = 'pending'
22.     RETURN activeTransaction.id
23.     
24. FUNCTION addAssistantMessageToTransaction(content: string, toolCalls: ToolCall[]):
25.     IF activeTransaction == null:
26.         THROW "No active transaction"
27.     IF activeTransaction.assistantMessage != null:
28.         THROW "Assistant message already set"
29.         
30.     // Create message but DON'T add to history yet
31.     assistantMsg = createMessage(content, 'assistant')
32.     activeTransaction.assistantMessage = assistantMsg
33.     
34.     // Track tool calls in transaction
35.     FOR EACH call IN toolCalls:
36.         activeTransaction.toolCalls.set(call.id, call)
37.     
38. FUNCTION addToolResponseToTransaction(toolCallId: string, response: ToolResponse):
39.     IF activeTransaction == null:
40.         THROW "No active transaction"
41.     IF NOT activeTransaction.toolCalls.has(toolCallId):
42.         THROW "Tool call not found in transaction"
43.     IF activeTransaction.toolResponses.has(toolCallId):
44.         THROW "Response already recorded"
45.         
46.     activeTransaction.toolResponses.set(toolCallId, response)
47.     
48. FUNCTION commitTransaction():
49.     IF activeTransaction == null:
50.         THROW "No active transaction"
51.         
52.     // Validate completeness
53.     FOR EACH [callId, call] IN activeTransaction.toolCalls:
54.         IF NOT activeTransaction.toolResponses.has(callId):
55.             THROW "Missing response for tool call " + callId
56.             
57.     // ATOMIC: Add both assistant message and tool responses
58.     IF activeTransaction.assistantMessage != null:
59.         messages.push(activeTransaction.assistantMessage)
60.         
61.     // Create tool response message with all responses
62.     IF activeTransaction.toolResponses.size > 0:
63.         toolMessage = createToolResponseMessage(activeTransaction.toolResponses)
64.         messages.push(toolMessage)
65.         
66.     // Mark committed and archive
67.     activeTransaction.state = 'committed'
68.     transactionHistory.push(activeTransaction)
69.     activeTransaction = null
70.     
71. FUNCTION rollbackTransaction(reason: string):
72.     IF activeTransaction == null:
73.         RETURN // Nothing to rollback
74.         
75.     // Create cancellation responses for pending calls
76.     FOR EACH [callId, call] IN activeTransaction.toolCalls:
77.         IF NOT activeTransaction.toolResponses.has(callId):
78.             cancelResponse = createCancellationResponse(callId, reason)
79.             activeTransaction.toolResponses.set(callId, cancelResponse)
80.             
81.     // Commit the cancelled state
82.     commitTransaction()
```

## Integration with Turn.ts

```pseudocode  
85. CLASS Turn:
86.     properties:
87.         historyService: HistoryService
88.         currentTransaction: string | null
89.         
90. FUNCTION handleAssistantResponse(response: StreamResponse):
91.     // Begin transaction when assistant starts responding
92.     IF response.hasToolCalls AND currentTransaction == null:
93.         currentTransaction = historyService.beginToolTransaction()
94.         
95.     // Extract content and tool calls
96.     content = response.getContent()
97.     toolCalls = response.getToolCalls()
98.     
99.     IF currentTransaction != null:
100.        historyService.addAssistantMessageToTransaction(content, toolCalls)
101.    ELSE:
102.        // No tools, add message directly
103.        historyService.addMessage(content, 'assistant')
104.        
105. FUNCTION handleToolExecution(toolCallId: string, result: any):
106.    IF currentTransaction == null:
107.        THROW "No active transaction for tool response"
108.        
109.    response = createToolResponse(toolCallId, result)
110.    historyService.addToolResponseToTransaction(toolCallId, response)
111.    
112.    // Check if all tools completed
113.    IF allToolsCompleted():
114.        historyService.commitTransaction()
115.        currentTransaction = null
116.        
117. FUNCTION handleCancellation():
118.    IF currentTransaction != null:
119.        historyService.rollbackTransaction("User cancelled")
120.        currentTransaction = null
```

## Parallel Tool Handling

```pseudocode
125. FUNCTION handleParallelTools(toolCalls: ToolCall[]):
126.    transactionId = historyService.beginToolTransaction()
127.    
128.    // Add all tool calls to transaction
129.    historyService.addAssistantMessageToTransaction("", toolCalls)
130.    
131.    // Execute tools in parallel
132.    promises = []
133.    FOR EACH call IN toolCalls:
134.        promise = executeToolAsync(call).then(result => {
135.            historyService.addToolResponseToTransaction(call.id, result)
136.        })
137.        promises.push(promise)
138.        
139.    // Wait for all to complete
140.    TRY:
141.        AWAIT Promise.all(promises)
142.        historyService.commitTransaction()
143.    CATCH error:
144.        historyService.rollbackTransaction(error.message)
```

## User Message Handling

```pseudocode  
150. FUNCTION handleUserMessage(content: string):
151.    // Check for active transaction
152.    IF historyService.hasActiveTransaction():
153.        // User interrupted tools - rollback
154.        historyService.rollbackTransaction("User sent new message")
155.        
156.    // Add user message normally
157.    historyService.addMessage(content, 'user')
```

## Orphan Prevention Tests

```pseudocode
160. TEST "prevents orphaned tool calls on user interruption":
161.    // Setup
162.    service = new HistoryService()
163.    
164.    // Start transaction with tool calls
165.    txId = service.beginToolTransaction()
166.    service.addAssistantMessageToTransaction("Using tools", [
167.        {id: "call1", name: "getTodo", args: {}}
168.    ])
169.    
170.    // User sends message before tool completes
171.    service.rollbackTransaction("User interrupted")
172.    service.addMessage("Stop!", 'user')
173.    
174.    // Verify no orphans
175.    history = service.getHistory()
176.    ASSERT history[0].role == 'assistant'
177.    ASSERT history[1].role == 'tool'  // Cancellation response
178.    ASSERT history[1].responses[0].error == "User interrupted"
179.    ASSERT history[2].role == 'user'
180.    
181. TEST "handles parallel tool execution":
182.    service = new HistoryService()
183.    
184.    txId = service.beginToolTransaction()
185.    service.addAssistantMessageToTransaction("Running multiple tools", [
186.        {id: "call1", name: "tool1", args: {}},
187.        {id: "call2", name: "tool2", args: {}}
188.    ])
189.    
190.    // Simulate parallel responses
191.    service.addToolResponseToTransaction("call2", {result: "result2"})
192.    service.addToolResponseToTransaction("call1", {result: "result1"})
193.    
194.    // Commit when all complete
195.    service.commitTransaction()
196.    
197.    history = service.getHistory()
198.    ASSERT history[0].role == 'assistant'
199.    ASSERT history[1].role == 'tool'
200.    ASSERT history[1].responses.length == 2
201.    
202. TEST "prevents adding messages during active transaction":
203.    service = new HistoryService()
204.    
205.    txId = service.beginToolTransaction()
206.    service.addAssistantMessageToTransaction("Tools", [{id: "c1", name: "t1"}])
207.    
208.    // Try to add message directly
209.    TRY:
210.        service.addMessage("test", 'user')
211.        FAIL "Should have thrown"
212.    CATCH error:
213.        ASSERT error.message.includes("transaction in progress")
```

## State Machine Integration

```pseudocode
220. ENUM HistoryState:
221.    IDLE
222.    MODEL_RESPONDING  
223.    TRANSACTION_ACTIVE
224.    TRANSACTION_COMMITTING
225.    
226. FUNCTION validateStateTransition(from: HistoryState, to: HistoryState):
227.    SWITCH from:
228.        CASE IDLE:
229.            RETURN to IN [MODEL_RESPONDING, TRANSACTION_ACTIVE]
230.        CASE MODEL_RESPONDING:
231.            RETURN to IN [IDLE, TRANSACTION_ACTIVE]
232.        CASE TRANSACTION_ACTIVE:
233.            RETURN to IN [TRANSACTION_COMMITTING]
234.        CASE TRANSACTION_COMMITTING:
235.            RETURN to IN [IDLE]
236.    RETURN false
```

## Migration from Current Code

```pseudocode
240. FUNCTION migrateFromPendingToolCalls():
241.    // Phase 1: Add transaction support alongside existing
242.    IF pendingToolCalls.size > 0 AND activeTransaction == null:
243.        // Start transaction for existing pending calls
244.        beginToolTransaction()
245.        FOR EACH [id, call] IN pendingToolCalls:
246.            activeTransaction.toolCalls.set(id, call)
247.            
248.    // Phase 2: Remove old mechanism
249.    // DELETE pendingToolCalls property
250.    // DELETE fixOrphans method
251.    // DELETE inline orphan prevention in addMessage
```