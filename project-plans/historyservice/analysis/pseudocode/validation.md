# Validation Methods Pseudocode

## MessageValidator Implementation

```
10: CLASS MessageValidator
11:   PROPERTIES:
12:     maxMessageLength: number = 100000
13:     maxMetadataSize: number = 10000
14:     allowedRoles: MessageRole[] = [USER, ASSISTANT, SYSTEM, TOOL]
15:     contentValidators: Map<MessageRole, Function>
16: 
17: METHOD constructor()
18:   // @requirement HS-018: Initialize validation system
19:   INITIALIZE this.contentValidators with:
20:     USER -> validateUserContent
21:     ASSISTANT -> validateAssistantContent
22:     SYSTEM -> validateSystemContent
23:     TOOL -> validateToolContent
24: END METHOD
25: 
26: METHOD validateMessage(content: string, role: MessageRole, metadata?: MessageMetadata)
27:   // @requirement HS-018: Validate complete message structure
28:   BEGIN VALIDATION
29:   TRY
30:     CALL this.validateContent(content)
31:     CALL this.validateRole(role)
32:     CALL this.validateMetadata(metadata)
33:     CALL this.validateRoleSpecificContent(content, role)
34:     CALL this.validateContentSafety(content)
35:     RETURN validation success
36:   CATCH ValidationError as error
37:     THROW ValidationError("Message validation failed: " + error.message)
38:   END TRY
39: END METHOD
40: 
41: METHOD validateContent(content: string)
42:   // @requirement HS-018: Validate message content
43:   IF content is null or undefined
44:     THROW ValidationError("Message content cannot be null or undefined")
45:   END IF
46:   IF typeof content is not string
47:     THROW ValidationError("Message content must be a string")
48:   END IF
49:   IF content.length is 0
50:     THROW ValidationError("Message content cannot be empty")
51:   END IF
52:   IF content.length > this.maxMessageLength
53:     THROW ValidationError("Message content exceeds maximum length of " + this.maxMessageLength)
54:   END IF
55:   IF content contains only whitespace
56:     THROW ValidationError("Message content cannot be only whitespace")
57:   END IF
58:   RETURN true
59: END METHOD
60: 
61: METHOD validateRole(role: MessageRole)
62:   // @requirement HS-019: Validate message role
63:   IF role is null or undefined
64:     THROW ValidationError("Message role cannot be null or undefined")
65:   END IF
66:   IF role not in this.allowedRoles
67:     THROW ValidationError("Invalid message role: " + role)
68:   END IF
69:   RETURN true
70: END METHOD
71: 
72: METHOD validateMetadata(metadata?: MessageMetadata)
73:   // @requirement HS-019: Validate message metadata
74:   IF metadata is null or undefined
75:     RETURN true  // Metadata is optional
76:   END IF
77:   IF typeof metadata is not object
78:     THROW ValidationError("Metadata must be an object")
79:   END IF
80:   CALCULATE metadataSize = JSON.stringify(metadata).length
81:   IF metadataSize > this.maxMetadataSize
82:     THROW ValidationError("Metadata size exceeds maximum of " + this.maxMetadataSize)
83:   END IF
84:   IF metadata.timestamp
85:     CALL this.validateTimestamp(metadata.timestamp)
86:   END IF
87:   IF metadata.editHistory
88:     CALL this.validateEditHistory(metadata.editHistory)
89:   END IF
90:   IF metadata.toolCallId
91:     CALL this.validateToolCallId(metadata.toolCallId)
92:   END IF
93:   RETURN true
94: END METHOD
95: 
96: METHOD validateRoleSpecificContent(content: string, role: MessageRole)
97:   // @requirement HS-020: Role-specific content validation
98:   GET validator = this.contentValidators.get(role)
99:   IF validator exists
100:     CALL validator(content)
101:   END IF
102:   RETURN true
103: END METHOD
104: 
105: METHOD validateUserContent(content: string)
106:   // @requirement HS-020: Validate user message content
107:   // User content is generally free-form, but check for basic safety
108:   IF content.length > 50000  // Stricter limit for user messages
109:     THROW ValidationError("User message exceeds maximum length of 50000")
110:   END IF
111:   CALL this.validateContentSafety(content)
112:   RETURN true
113: END METHOD
114: 
115: METHOD validateAssistantContent(content: string)
116:   // @requirement HS-020: Validate assistant message content
117:   // Assistant content should be well-formed
118:   IF content contains malformed JSON in code blocks
119:     LOG "Warning: Assistant message contains malformed JSON"
120:   END IF
121:   RETURN true
122: END METHOD
123: 
124: METHOD validateSystemContent(content: string)
125:   // @requirement HS-020: Validate system message content
126:   // System messages should be structured
127:   IF content.length > 10000
128:     THROW ValidationError("System message exceeds maximum length of 10000")
129:   END IF
130:   RETURN true
131: END METHOD
132: 
133: METHOD validateToolContent(content: string)
134:   // @requirement HS-020: Validate tool message content
135:   TRY
136:     // Tool content should be valid JSON
137:     PARSE content as JSON
138:     RETURN true
139:   CATCH JSON parse error
140:     THROW ValidationError("Tool message content must be valid JSON")
141:   END TRY
142: END METHOD
143: 
144: METHOD validateContentSafety(content: string)
145:   // @requirement HS-021: Content safety validation
146:   IF content contains potential script injection patterns
147:     THROW ValidationError("Content contains potentially unsafe script patterns")
148:   END IF
149:   IF content contains malicious URLs
150:     THROW ValidationError("Content contains potentially malicious URLs")
151:   END IF
152:   IF content contains excessive HTML tags
153:     THROW ValidationError("Content contains excessive HTML tags")
154:   END IF
155:   RETURN true
156: END METHOD
157: 
158: METHOD validateMessageUpdate(updates: MessageUpdate)
159:   // @requirement HS-022: Validate message updates
160:   IF updates is null or undefined
161:     THROW ValidationError("Updates cannot be null or undefined")
162:   END IF
163:   IF typeof updates is not object
164:     THROW ValidationError("Updates must be an object")
165:   END IF
166:   IF Object.keys(updates).length is 0
167:     THROW ValidationError("Updates cannot be empty")
168:   END IF
169:   IF updates.content
170:     CALL this.validateContent(updates.content)
171:   END IF
172:   IF updates.metadata
173:     CALL this.validateMetadata(updates.metadata)
174:   END IF
175:   IF updates.role
176:     THROW ValidationError("Cannot update message role")
177:   END IF
178:   IF updates.id
179:     THROW ValidationError("Cannot update message ID")
180:   END IF
181:   IF updates.timestamp
182:     THROW ValidationError("Cannot manually update timestamp")
183:   END IF
184:   RETURN true
185: END METHOD
186: 
187: METHOD validateTimestamp(timestamp: number)
188:   // Helper method to validate timestamps
189:   IF typeof timestamp is not number
190:     THROW ValidationError("Timestamp must be a number")
191:   END IF
192:   IF timestamp < 0
193:     THROW ValidationError("Timestamp cannot be negative")
194:   END IF
195:   IF timestamp > currentTimestamp() + 86400000  // 24 hours future
196:     THROW ValidationError("Timestamp cannot be more than 24 hours in the future")
197:   END IF
198:   RETURN true
199: END METHOD
200: 
201: METHOD validateEditHistory(editHistory: EditHistoryEntry[])
202:   // Helper method to validate edit history
203:   IF not Array.isArray(editHistory)
204:     THROW ValidationError("Edit history must be an array")
205:   END IF
206:   FOR each entry in editHistory
207:     IF entry.timestamp is missing
208:       THROW ValidationError("Edit history entry must have timestamp")
209:     END IF
210:     IF entry.previousContent is missing
211:       THROW ValidationError("Edit history entry must have previous content")
212:     END IF
213:     CALL this.validateTimestamp(entry.timestamp)
214:   END FOR
215:   RETURN true
216: END METHOD
217: 
218: METHOD validateToolCallId(toolCallId: string)
219:   // Helper method to validate tool call IDs
220:   IF typeof toolCallId is not string
221:     THROW ValidationError("Tool call ID must be a string")
222:   END IF
223:   IF toolCallId.length is 0
224:     THROW ValidationError("Tool call ID cannot be empty")
225:   END IF
226:   IF not toolCallId matches UUID pattern
227:     THROW ValidationError("Tool call ID must be a valid UUID")
228:   END IF
229:   RETURN true
230: END METHOD
231: 
232: METHOD validateConversationId(conversationId: string)
233:   // @requirement HS-018: Validate conversation ID
234:   IF conversationId is null or undefined
235:     THROW ValidationError("Conversation ID cannot be null or undefined")
236:   END IF
237:   IF typeof conversationId is not string
238:     THROW ValidationError("Conversation ID must be a string")
239:   END IF
240:   IF conversationId.length is 0
241:     THROW ValidationError("Conversation ID cannot be empty")
242:   END IF
243:   IF conversationId.length > 255
244:     THROW ValidationError("Conversation ID exceeds maximum length of 255")
245:   END IF
246:   IF not conversationId matches valid ID pattern
247:     THROW ValidationError("Conversation ID contains invalid characters")
248:   END IF
249:   RETURN true
250: END METHOD
251: 
252: METHOD validateSearchQuery(query: SearchQuery)
253:   // @requirement HS-022: Validate search queries
254:   IF query is null or undefined
255:     THROW ValidationError("Search query cannot be null or undefined")
256:   END IF
257:   IF query.text AND query.text.length > 1000
258:     THROW ValidationError("Search text exceeds maximum length of 1000")
259:   END IF
260:   IF query.role AND query.role not in this.allowedRoles
261:     THROW ValidationError("Invalid search role: " + query.role)
262:   END IF
263:   IF query.dateRange
264:     IF query.dateRange.start > query.dateRange.end
265:       THROW ValidationError("Search date range start must be before end")
266:     END IF
267:   END IF
268:   RETURN true
269: END METHOD
270: 
271: METHOD validateExportFormat(format: ExportFormat)
272:   // @requirement HS-022: Validate export format
273:   SET allowedFormats = [JSON, XML, CSV, MARKDOWN]
274:   IF format not in allowedFormats
275:     THROW ValidationError("Invalid export format: " + format)
276:   END IF
277:   RETURN true
278: END METHOD
279: 
280: METHOD validateImportData(data: string, format: ExportFormat)
281:   // @requirement HS-022: Validate import data
282:   IF data is null or undefined
283:     THROW ValidationError("Import data cannot be null or undefined")
284:   END IF
285:   IF data.length is 0
286:     THROW ValidationError("Import data cannot be empty")
287:   END IF
288:   IF data.length > 10000000  // 10MB limit
289:     THROW ValidationError("Import data exceeds maximum size of 10MB")
290:   END IF
291:   CALL this.validateExportFormat(format)
292:   TRY
293:     SWITCH format
294:       CASE JSON:
295:         PARSE data as JSON
296:       CASE XML:
297:         CALL validateXMLStructure(data)
298:       CASE CSV:
299:         CALL validateCSVStructure(data)
300:       CASE MARKDOWN:
301:         CALL validateMarkdownStructure(data)
302:     END SWITCH
303:     RETURN true
304:   CATCH parse error
305:     THROW ValidationError("Import data is not valid " + format + ": " + parse error.message)
306:   END TRY
307: END METHOD
308: 
309: END CLASS
```