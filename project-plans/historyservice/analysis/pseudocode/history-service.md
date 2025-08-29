# HistoryService Core Methods Pseudocode

## Core HistoryService Implementation

```
10: CLASS HistoryService
11:   PROPERTIES:
12:     conversationId: string
13:     messages: Message[]
14:     pendingToolCalls: Map<string, ToolCall>
15:     toolResponses: Map<string, ToolResponse>
16:     state: HistoryState
17:     eventEmitter: EventEmitter
18:     validator: MessageValidator
19:     stateManager: StateManager
20: 
21: METHOD constructor(conversationId: string)
22:   // @requirement HS-001: Initialize conversation history
23:   VALIDATE conversationId is not empty
24:   IF conversationId is empty
25:     THROW ValidationError("ConversationId cannot be empty")
26:   END IF
27:   SET this.conversationId = conversationId
28:   SET this.messages = empty array
29:   SET this.pendingToolCalls = empty map
30:   SET this.toolResponses = empty map
31:   SET this.state = READY
32:   INITIALIZE this.eventEmitter
33:   INITIALIZE this.validator
34:   INITIALIZE this.stateManager
35:   EMIT ConversationStarted event
36: END METHOD
37: 
38: METHOD addMessage(content: string, role: MessageRole, metadata?: MessageMetadata)
39:   // @requirement HS-002: Add message to conversation history
40:   BEGIN TRANSACTION
41:   TRY
42:     VALIDATE state allows message addition
43:     CALL this.stateManager.validateStateTransition(ADD_MESSAGE)
44:     VALIDATE message content and role
45:     CALL this.validator.validateMessage(content, role, metadata)
46:     CREATE message object with:
47:       id: generateUUID()
48:       content: content
49:       role: role
50:       timestamp: currentTimestamp()
51:       metadata: metadata or default
52:       conversationId: this.conversationId
53:     ADD message to this.messages array
54:     UPDATE state if needed
55:     EMIT MessageAdded event with message
56:     COMMIT TRANSACTION
57:     RETURN message.id
58:   CATCH error
59:     ROLLBACK TRANSACTION
60:     EMIT MessageAddError event with error
61:     THROW error
62:   END TRY
63: END METHOD
64: 
65: METHOD getMessages(startIndex?: number, count?: number)
66:   // @requirement HS-003: Retrieve conversation history
67:   VALIDATE startIndex and count if provided
68:   IF startIndex < 0
69:     THROW ValidationError("StartIndex must be non-negative")
70:   END IF
71:   IF count <= 0
72:     THROW ValidationError("Count must be positive")
73:   END IF
74:   CALCULATE actualStartIndex = startIndex or 0
75:   CALCULATE actualCount = count or (messages.length - actualStartIndex)
76:   RETURN this.messages.slice(actualStartIndex, actualStartIndex + actualCount)
77: END METHOD
78: 
79: METHOD getMessageById(messageId: string)
80:   // @requirement HS-004: Get specific message by ID
81:   VALIDATE messageId is not empty
82:   IF messageId is empty
83:     THROW ValidationError("MessageId cannot be empty")
84:   END IF
85:   FIND message in this.messages where id equals messageId
86:   IF message not found
87:     THROW NotFoundError("Message not found with id: " + messageId)
88:   END IF
89:   RETURN message
90: END METHOD
91: 
92: METHOD updateMessage(messageId: string, updates: MessageUpdate)
93:   // @requirement HS-005: Update existing message
94:   BEGIN TRANSACTION
95:   TRY
96:     VALIDATE messageId is not empty
97:     VALIDATE updates object
98:     CALL this.validator.validateMessageUpdate(updates)
99:     FIND message index in this.messages where id equals messageId
100:     IF message not found
101:       THROW NotFoundError("Message not found with id: " + messageId)
102:     END IF
103:     GET existing message = this.messages[messageIndex]
104:     VALIDATE message can be updated (not system-locked)
105:     IF existing message.metadata.locked
106:       THROW StateError("Cannot update locked message")
107:     END IF
108:     CREATE updated message by merging existing with updates
109:     SET updated message.metadata.lastModified = currentTimestamp()
110:     SET this.messages[messageIndex] = updated message
111:     EMIT MessageUpdated event with old and new message
112:     COMMIT TRANSACTION
113:     RETURN updated message
114:   CATCH error
115:     ROLLBACK TRANSACTION
116:     EMIT MessageUpdateError event with error
117:     THROW error
118:   END TRY
119: END METHOD
120: 
121: METHOD deleteMessage(messageId: string)
122:   // @requirement HS-006: Remove message from history
123:   BEGIN TRANSACTION
124:   TRY
125:     VALIDATE messageId is not empty
126:     FIND message index in this.messages where id equals messageId
127:     IF message not found
128:       THROW NotFoundError("Message not found with id: " + messageId)
129:     END IF
130:     GET message = this.messages[messageIndex]
131:     VALIDATE message can be deleted (not system-protected)
132:     IF message.metadata.protected
133:       THROW StateError("Cannot delete protected message")
134:     END IF
135:     REMOVE message from this.messages at messageIndex
136:     EMIT MessageDeleted event with deleted message
137:     COMMIT TRANSACTION
138:     RETURN true
139:   CATCH error
140:     ROLLBACK TRANSACTION
141:     EMIT MessageDeleteError event with error
142:     THROW error
143:   END TRY
144: END METHOD
145: 
146: METHOD clearHistory()
147:   // @requirement HS-007: Clear all conversation history
148:   BEGIN TRANSACTION
149:   TRY
150:     VALIDATE state allows clearing
151:     IF state is TOOLS_EXECUTING
152:       THROW StateError("Cannot clear history during tool execution")
153:     END IF
154:     STORE messageCount = this.messages.length
155:     SET this.messages = empty array
156:     SET this.pendingToolCalls = empty map
157:     SET this.toolResponses = empty map
158:     SET this.state = READY
159:     EMIT HistoryCleared event with messageCount
160:     COMMIT TRANSACTION
161:     RETURN messageCount
162:   CATCH error
163:     ROLLBACK TRANSACTION
164:     EMIT HistoryClearError event with error
165:     THROW error
166:   END TRY
167: END METHOD
168: 
169: METHOD getConversationMetadata()
170:   // @requirement HS-008: Get conversation metadata
171:   RETURN object with:
172:     conversationId: this.conversationId
173:     messageCount: this.messages.length
174:     state: this.state
175:     createdAt: this.messages[0]?.timestamp or null
176:     lastModified: last message timestamp or null
177:     pendingToolCalls: this.pendingToolCalls.size
178:     toolResponses: this.toolResponses.size
179:     hasErrors: check for error messages in history
180: END METHOD
181: 
182: METHOD exportHistory(format: ExportFormat)
183:   // @requirement HS-023: Export conversation history
184:   VALIDATE format is supported
185:   IF format not in [JSON, XML, CSV, MARKDOWN]
186:     THROW ValidationError("Unsupported export format: " + format)
187:   END IF
188:   SWITCH format
189:     CASE JSON:
190:       RETURN JSON.stringify(this.messages)
191:     CASE XML:
192:       RETURN convertMessagesToXML(this.messages)
193:     CASE CSV:
194:       RETURN convertMessagesToCSV(this.messages)
195:     CASE MARKDOWN:
196:       RETURN convertMessagesToMarkdown(this.messages)
197:   END SWITCH
198: END METHOD
199: 
200: METHOD importHistory(data: string, format: ExportFormat)
201:   // @requirement HS-024: Import conversation history
202:   BEGIN TRANSACTION
203:   TRY
204:     VALIDATE format is supported
205:     VALIDATE data is not empty
206:     VALIDATE current state allows import
207:     IF this.messages.length > 0
208:       THROW StateError("Cannot import into non-empty conversation")
209:     END IF
210:     SWITCH format
211:       CASE JSON:
212:         SET importedMessages = JSON.parse(data)
213:       CASE XML:
214:         SET importedMessages = parseXMLToMessages(data)
215:       CASE CSV:
216:         SET importedMessages = parseCSVToMessages(data)
217:       CASE MARKDOWN:
218:         SET importedMessages = parseMarkdownToMessages(data)
219:     END SWITCH
220:     VALIDATE imported messages structure
221:     FOR each message in importedMessages
222:       CALL this.validator.validateMessage(message.content, message.role, message.metadata)
223:     END FOR
224:     SET this.messages = importedMessages
225:     EMIT HistoryImported event with message count
226:     COMMIT TRANSACTION
227:     RETURN importedMessages.length
228:   CATCH error
229:     ROLLBACK TRANSACTION
230:     EMIT HistoryImportError event with error
231:     THROW error
232:   END TRY
233: END METHOD
234: 
235: METHOD searchMessages(query: SearchQuery)
236:   // @requirement HS-025: Search through conversation history
237:   VALIDATE query is not empty
238:   IF query.text is empty AND query.role is null AND query.dateRange is null
239:     THROW ValidationError("Search query must have at least one criterion")
240:   END IF
241:   INITIALIZE results = empty array
242:   FOR each message in this.messages
243:     SET matches = true
244:     IF query.text is provided
245:       IF message.content does not contain query.text (case-insensitive)
246:         SET matches = false
247:       END IF
248:     END IF
249:     IF query.role is provided
250:       IF message.role does not equal query.role
251:         SET matches = false
252:       END IF
253:     END IF
254:     IF query.dateRange is provided
255:       IF message.timestamp not within query.dateRange
256:         SET matches = false
257:       END IF
258:     END IF
259:     IF matches is true
260:       ADD message to results
261:     END IF
262:   END FOR
263:   RETURN results
264: END METHOD
265: 
266: METHOD getMessageContext(messageId: string, contextSize: number)
267:   // @requirement HS-030: Get context around a specific message
268:   VALIDATE messageId is not empty
269:   VALIDATE contextSize is positive
270:   FIND message index in this.messages where id equals messageId
271:   IF message not found
272:     THROW NotFoundError("Message not found with id: " + messageId)
273:   END IF
274:   CALCULATE startIndex = max(0, messageIndex - contextSize)
275:   CALCULATE endIndex = min(this.messages.length - 1, messageIndex + contextSize)
276:   RETURN object with:
277:     centerMessage: this.messages[messageIndex]
278:     beforeMessages: this.messages.slice(startIndex, messageIndex)
279:     afterMessages: this.messages.slice(messageIndex + 1, endIndex + 1)
280:     totalContext: endIndex - startIndex + 1
281: END METHOD
282: 
283: METHOD getStatistics()
284:   // @requirement HS-031: Get conversation statistics
285:   CALCULATE userMessages = count messages where role is USER
286:   CALCULATE assistantMessages = count messages where role is ASSISTANT
287:   CALCULATE systemMessages = count messages where role is SYSTEM
288:   CALCULATE toolMessages = count messages where role is TOOL
289:   CALCULATE avgMessageLength = sum of all message lengths / total messages
290:   CALCULATE conversationDuration = last message timestamp - first message timestamp
291:   RETURN object with:
292:     totalMessages: this.messages.length
293:     userMessages: userMessages
294:     assistantMessages: assistantMessages
295:     systemMessages: systemMessages
296:     toolMessages: toolMessages
297:     averageMessageLength: avgMessageLength
298:     conversationDuration: conversationDuration
299:     toolCallsCount: this.pendingToolCalls.size + this.toolResponses.size
300:     currentState: this.state
301: END METHOD
302: 
303: METHOD createSnapshot()
304:   // @requirement HS-032: Create conversation snapshot
305:   RETURN object with:
306:     timestamp: currentTimestamp()
307:     conversationId: this.conversationId
308:     state: this.state
309:     messageCount: this.messages.length
310:     messages: deep copy of this.messages
311:     pendingToolCalls: deep copy of this.pendingToolCalls
312:     toolResponses: deep copy of this.toolResponses
313:     metadata: this.getConversationMetadata()
314: END METHOD
315: 
316: METHOD restoreSnapshot(snapshot: ConversationSnapshot)
317:   // @requirement HS-033: Restore from conversation snapshot
318:   BEGIN TRANSACTION
319:   TRY
320:     VALIDATE snapshot structure
321:     VALIDATE snapshot.conversationId matches this.conversationId
322:     IF snapshot.conversationId != this.conversationId
323:       THROW ValidationError("Snapshot conversation ID mismatch")
324:     END IF
325:     VALIDATE all messages in snapshot
326:     FOR each message in snapshot.messages
327:       CALL this.validator.validateMessage(message.content, message.role, message.metadata)
328:     END FOR
329:     SET this.messages = deep copy of snapshot.messages
330:     SET this.pendingToolCalls = deep copy of snapshot.pendingToolCalls
331:     SET this.toolResponses = deep copy of snapshot.toolResponses
332:     SET this.state = snapshot.state
333:     EMIT SnapshotRestored event with snapshot timestamp
334:     COMMIT TRANSACTION
335:     RETURN true
336:   CATCH error
337:     ROLLBACK TRANSACTION
338:     EMIT SnapshotRestoreError event with error
339:     THROW error
340:   END TRY
341: END METHOD
342: 
343: METHOD getMessageHistory(messageId: string)
344:   // @requirement HS-034: Get edit history of a message
345:   VALIDATE messageId is not empty
346:   FIND message in this.messages where id equals messageId
347:   IF message not found
348:     THROW NotFoundError("Message not found with id: " + messageId)
349:   END IF
350:   IF message.metadata.editHistory is empty
351:     RETURN empty array
352:   END IF
353:   RETURN message.metadata.editHistory
354: END METHOD
355: 
356: METHOD undoLastMessage()
357:   // @requirement HS-035: Undo last message addition
358:   BEGIN TRANSACTION
359:   TRY
360:     IF this.messages.length is 0
361:       THROW StateError("No messages to undo")
362:     END IF
363:     GET lastMessage = this.messages[this.messages.length - 1]
364:     VALIDATE message can be undone (not protected)
365:     IF lastMessage.metadata.protected
366:       THROW StateError("Cannot undo protected message")
367:     END IF
368:     REMOVE last message from this.messages
369:     EMIT MessageUndone event with undone message
370:     COMMIT TRANSACTION
371:     RETURN lastMessage
372:   CATCH error
373:     ROLLBACK TRANSACTION
374:     EMIT MessageUndoError event with error
375:     THROW error
376:   END TRY
377: END METHOD
378: 
379: END CLASS
```