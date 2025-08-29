# Event System Pseudocode

## EventManager Implementation

```
10: CLASS EventManager
11:   PROPERTIES:
12:     eventEmitter: EventEmitter
13:     eventHistory: EventRecord[]
14:     eventListeners: Map<string, Function[]>
15:     maxHistorySize: number = 1000
16:     enableHistory: boolean = true
17: 
18: METHOD constructor()
19:   // @requirement HS-026: Initialize event system
20:   INITIALIZE this.eventEmitter
21:   SET this.eventHistory = empty array
22:   SET this.eventListeners = empty map
23:   CALL this.setupDefaultEventHandlers()
24: END METHOD
25: 
26: METHOD emit(eventType: string, eventData: any, metadata?: EventMetadata)
27:   // @requirement HS-026: Emit events
28:   BEGIN TRANSACTION
29:   TRY
30:     VALIDATE eventType is not empty
31:     IF eventType.length is 0
32:       THROW ValidationError("Event type cannot be empty")
33:     END IF
34:     CREATE event record with:
35:       id: generateUUID()
36:       type: eventType
37:       data: eventData
38:       timestamp: currentTimestamp()
39:       metadata: metadata or {}
40:       source: "HistoryService"
41:     IF this.enableHistory
42:       ADD event record to this.eventHistory
43:       CALL this.maintainHistorySize()
44:     END IF
45:     EMIT eventType with event record using this.eventEmitter
46:     CALL this.notifyListeners(eventType, event record)
47:     COMMIT TRANSACTION
48:     RETURN event record.id
49:   CATCH error
50:     ROLLBACK TRANSACTION
51:     LOG "Event emission failed: " + error.message
52:     THROW error
53:   END TRY
54: END METHOD
55: 
56: METHOD addEventListener(eventType: string, listener: Function)
57:   // @requirement HS-027: Add event listeners
58:   VALIDATE eventType is not empty
59:   VALIDATE listener is function
60:   IF typeof listener is not function
61:     THROW ValidationError("Event listener must be a function")
62:   END IF
63:   IF not this.eventListeners.has(eventType)
64:     SET this.eventListeners.set(eventType, empty array)
65:   END IF
66:   GET listeners = this.eventListeners.get(eventType)
67:   ADD listener to listeners
68:   RETURN listener registration ID
69: END METHOD
70: 
71: METHOD removeEventListener(eventType: string, listener: Function)
72:   // @requirement HS-027: Remove event listeners
73:   VALIDATE eventType is not empty
74:   IF not this.eventListeners.has(eventType)
75:     RETURN false  // Event type not registered
76:   END IF
77:   GET listeners = this.eventListeners.get(eventType)
78:   FIND index of listener in listeners array
79:   IF listener found
80:     REMOVE listener from listeners at index
81:     RETURN true
82:   END IF
83:   RETURN false
84: END METHOD
85: 
86: METHOD getEventHistory(eventType?: string, limit?: number)
87:   // @requirement HS-028: Get event history
88:   SET filteredEvents = this.eventHistory
89:   IF eventType is provided
90:     SET filteredEvents = this.eventHistory.filter(event => event.type === eventType)
91:   END IF
92:   IF limit is provided AND limit > 0
93:     SET filteredEvents = filteredEvents.slice(-limit)  // Get last N events
94:   END IF
95:   RETURN filteredEvents
96: END METHOD
97: 
98: METHOD clearEventHistory()
99:   // @requirement HS-029: Clear event history
100:   STORE previousCount = this.eventHistory.length
101:   SET this.eventHistory = empty array
102:   EMIT EventHistoryCleared with { clearedCount: previousCount }
103:   RETURN previousCount
104: END METHOD
105: 
106: METHOD setupDefaultEventHandlers()
107:   // Setup built-in event handlers for system events
108:   CALL this.addEventListener("MessageAdded", this.onMessageAdded)
109:   CALL this.addEventListener("MessageUpdated", this.onMessageUpdated)
110:   CALL this.addEventListener("MessageDeleted", this.onMessageDeleted)
111:   CALL this.addEventListener("StateChanged", this.onStateChanged)
112:   CALL this.addEventListener("ToolCallsAdded", this.onToolCallsAdded)
113:   CALL this.addEventListener("ToolExecutionCompleted", this.onToolExecutionCompleted)
114:   CALL this.addEventListener("ErrorOccurred", this.onErrorOccurred)
115: END METHOD
116: 
117: METHOD onMessageAdded(event: EventRecord)
118:   // @requirement HS-026: Handle message added events
119:   LOG "Message added: " + event.data.message?.id
120:   CALL this.updateConversationMetrics("messageAdded")
121: END METHOD
122: 
123: METHOD onMessageUpdated(event: EventRecord)
124:   // @requirement HS-026: Handle message updated events
125:   LOG "Message updated: " + event.data.newMessage?.id
126:   CALL this.updateConversationMetrics("messageUpdated")
127: END METHOD
128: 
129: METHOD onMessageDeleted(event: EventRecord)
130:   // @requirement HS-026: Handle message deleted events
131:   LOG "Message deleted: " + event.data.deletedMessage?.id
132:   CALL this.updateConversationMetrics("messageDeleted")
133: END METHOD
134: 
135: METHOD onStateChanged(event: EventRecord)
136:   // @requirement HS-026: Handle state change events
137:   LOG "State changed from " + event.data.fromState + " to " + event.data.toState
138:   EMIT StateTransitionLogged with event.data
139: END METHOD
140: 
141: METHOD onToolCallsAdded(event: EventRecord)
142:   // @requirement HS-026: Handle tool calls added events
143:   LOG "Tool calls added: " + event.data.toolCalls?.length
144:   CALL this.updateConversationMetrics("toolCallsAdded")
145: END METHOD
146: 
147: METHOD onToolExecutionCompleted(event: EventRecord)
148:   // @requirement HS-026: Handle tool execution completed events
149:   LOG "Tool execution completed: " + event.data.completedCalls?.length + " calls"
150:   CALL this.updateConversationMetrics("toolExecutionCompleted")
151: END METHOD
152: 
153: METHOD onErrorOccurred(event: EventRecord)
154:   // @requirement HS-026: Handle error events
155:   LOG "Error occurred: " + event.data.error?.message
156:   EMIT SystemErrorLogged with {
157:     error: event.data.error,
158:     timestamp: event.timestamp,
159:     context: event.data.context
160:   }
161: END METHOD
162: 
163: METHOD notifyListeners(eventType: string, eventRecord: EventRecord)
164:   // Helper method to notify all listeners of an event type
165:   IF not this.eventListeners.has(eventType)
166:     RETURN  // No listeners for this event type
167:   END IF
168:   GET listeners = this.eventListeners.get(eventType)
169:   FOR each listener in listeners
170:     TRY
171:       CALL listener(eventRecord)
172:     CATCH listener error
173:       LOG "Event listener error for " + eventType + ": " + listener error.message
174:       // Continue with other listeners
175:     END TRY
176:   END FOR
177: END METHOD
178: 
179: METHOD maintainHistorySize()
180:   // Helper method to maintain event history size limit
181:   IF this.eventHistory.length > this.maxHistorySize
182:     SET excessCount = this.eventHistory.length - this.maxHistorySize
183:     REMOVE first excessCount events from this.eventHistory
184:     LOG "Event history trimmed: removed " + excessCount + " old events"
185:   END IF
186: END METHOD
187: 
188: METHOD updateConversationMetrics(action: string)
189:   // Helper method to update conversation metrics
190:   EMIT ConversationMetricsUpdated with {
191:     action: action,
192:     timestamp: currentTimestamp(),
193:     conversationId: this.conversationId
194:   }
195: END METHOD
196: 
197: METHOD getEventStatistics()
198:   // Get statistics about events
199:   INITIALIZE eventTypeCount = empty map
200:   INITIALIZE eventsByHour = empty map
201:   FOR each event in this.eventHistory
202:     INCREMENT eventTypeCount[event.type]
203:     SET hour = Math.floor(event.timestamp / 3600000)  // Group by hour
204:     INCREMENT eventsByHour[hour]
205:   END FOR
206:   CALCULATE totalEvents = this.eventHistory.length
207:   CALCULATE avgEventsPerHour = totalEvents / Object.keys(eventsByHour).length
208:   GET mostRecentEvent = this.eventHistory[this.eventHistory.length - 1]
209:   RETURN {
210:     totalEvents: totalEvents,
211:     eventTypeCount: eventTypeCount,
212:     eventsByHour: eventsByHour,
213:     averageEventsPerHour: avgEventsPerHour,
214:     mostRecentEvent: mostRecentEvent,
215:     historyEnabled: this.enableHistory,
216:     maxHistorySize: this.maxHistorySize
217:   }
218: END METHOD
219: 
220: METHOD enableEventHistory(enabled: boolean)
221:   // Enable or disable event history recording
222:   SET this.enableHistory = enabled
223:   IF not enabled
224:     EMIT EventHistoryDisabled
225:   ELSE
226:     EMIT EventHistoryEnabled
227:   END IF
228:   RETURN enabled
229: END METHOD
230: 
231: METHOD setMaxHistorySize(size: number)
232:   // Set maximum event history size
233:   VALIDATE size > 0
234:   IF size <= 0
235:     THROW ValidationError("Max history size must be positive")
236:   END IF
237:   SET this.maxHistorySize = size
238:   CALL this.maintainHistorySize()  // Trim if necessary
239:   EMIT MaxHistorySizeChanged with { newSize: size }
240:   RETURN size
241: END METHOD
242: 
243: METHOD exportEventHistory(format: ExportFormat)
244:   // Export event history in specified format
245:   VALIDATE format is supported
246:   SWITCH format
247:     CASE JSON:
248:       RETURN JSON.stringify(this.eventHistory, null, 2)
249:     CASE CSV:
250:       RETURN this.convertEventsToCSV(this.eventHistory)
251:     CASE XML:
252:       RETURN this.convertEventsToXML(this.eventHistory)
253:     DEFAULT:
254:       THROW ValidationError("Unsupported export format: " + format)
255:   END SWITCH
256: END METHOD
257: 
258: METHOD convertEventsToCSV(events: EventRecord[])
259:   // Helper method to convert events to CSV format
260:   SET headers = ["id", "type", "timestamp", "source", "data"]
261:   SET csvLines = [headers.join(",")]
262:   FOR each event in events
263:     SET row = [
264:       event.id,
265:       event.type,
266:       event.timestamp,
267:       event.source,
268:       JSON.stringify(event.data).replace(/"/g, '""')  // Escape quotes
269:     ]
270:     ADD row.join(",") to csvLines
271:   END FOR
272:   RETURN csvLines.join("\n")
273: END METHOD
274: 
275: METHOD convertEventsToXML(events: EventRecord[])
276:   // Helper method to convert events to XML format
277:   SET xmlLines = ["<?xml version=\"1.0\" encoding=\"UTF-8\"?>", "<events>"]
278:   FOR each event in events
279:     ADD "  <event>" to xmlLines
280:     ADD "    <id>" + event.id + "</id>" to xmlLines
281:     ADD "    <type>" + event.type + "</type>" to xmlLines
282:     ADD "    <timestamp>" + event.timestamp + "</timestamp>" to xmlLines
283:     ADD "    <source>" + event.source + "</source>" to xmlLines
284:     ADD "    <data><![CDATA[" + JSON.stringify(event.data) + "]]></data>" to xmlLines
285:     ADD "  </event>" to xmlLines
286:   END FOR
287:   ADD "</events>" to xmlLines
288:   RETURN xmlLines.join("\n")
289: END METHOD
290: 
291: METHOD subscribeToEventPattern(pattern: string, listener: Function)
292:   // Subscribe to events matching a pattern (e.g., "Message*", "Tool*")
293:   VALIDATE pattern is not empty
294:   VALIDATE listener is function
295:   CREATE pattern matcher from pattern
296:   FOR each existing event type in this.eventListeners.keys()
297:     IF event type matches pattern
298:       CALL this.addEventListener(event type, listener)
299:     END IF
300:   END FOR
301:   // Store pattern for future event types
302:   STORE pattern and listener for dynamic matching
303:   RETURN pattern subscription ID
304: END METHOD
305: 
306: METHOD waitForEvent(eventType: string, timeout?: number)
307:   // Wait for a specific event to occur (returns Promise)
308:   RETURN new Promise((resolve, reject) => {
309:     SET timeoutId = null
310:     IF timeout is provided
311:       SET timeoutId = setTimeout(() => {
312:         CALL this.removeEventListener(eventType, eventHandler)
313:         reject(new TimeoutError("Event wait timeout: " + eventType))
314:       }, timeout)
315:     END IF
316:     SET eventHandler = (event) => {
317:       IF timeoutId
318:         clearTimeout(timeoutId)
319:       END IF
320:       CALL this.removeEventListener(eventType, eventHandler)
321:       resolve(event)
322:     }
323:     CALL this.addEventListener(eventType, eventHandler)
324:   })
325: END METHOD
326: 
327: END CLASS
```