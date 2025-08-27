# Pseudocode: Integration Flow

<!-- @plan PLAN-20250826-RESPONSES.P03 -->
<!-- @requirement REQ-001, REQ-INT-001 -->
<!-- Line numbers will be referenced in implementation phases -->

## SessionId Parameter Flow Integration

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

## GeminiChat to ContentGenerator Integration

```
92: METHOD sendMessage(userInput)
93:   // REQ-001.2: GeminiChat retrieves sessionId via config.getSessionId()
94:   sessionId = this.config.getSessionId()
95:   
96:   // Prepare contents with history
97:   contents = this.history.concat([userInput])
98:   
99:   // REQ-001.3: ContentGenerator passes sessionId to provider
100:  generator = this.contentGenerator.generate(contents, tools, toolFormat, sessionId)
101:  
102:  // Process responses and maintain history
103:  FOR EACH content IN generator
104:    this.history.push(content)
105:    YIELD content
106:  END FOR
107: END METHOD
```

## LoggingProviderWrapper Integration

```
108: METHOD generateChatCompletion(contents, tools, toolFormat, sessionId)
109:   // REQ-INT-001.2: Metadata flows through existing wrapper unchanged
110:   this.logger.logRequest(contents, sessionId)
111:   
112:   // Pass sessionId through to wrapped provider
113:   YIELD* this.wrappedProvider.generateChatCompletion(
114:     contents,
115:     tools,
116:     toolFormat,
117:     sessionId
118:   )
119:   
120:   this.logger.logResponse("generateChatCompletion completed")
121: END METHOD
```

## GeminiCompatibleWrapper Integration

```
122: METHOD generateChatCompletion(contents, tools, toolFormat, sessionId)
123:   // Convert Google Content format to provider format
124:   providerContents = this.convertContents(contents)
125:   providerTools = this.convertTools(tools)
126:   
127:   // Pass sessionId through to underlying provider
128:   YIELD* this.provider.generateChatCompletion(
129:     providerContents,
130:     providerTools, 
131:     toolFormat,
132:     sessionId  // Pass through sessionId parameter
133:   )
134: END METHOD
```

## IMessage Migration Process

```
135: PROCEDURE migrateFromIMessageToContent()
136:   // REQ-003.1: Remove all IMessage imports (file already deleted)
137:   affectedFiles = [
138:     "packages/core/src/providers/*.ts",
139:     "packages/cli/src/providers/*.ts", 
140:     "packages/core/src/providers/openai/*.ts",
141:     "packages/core/src/providers/anthropic/*.ts"
142:   ]
143:   
144:   FOR EACH filePath IN affectedFiles
145:     content = READ file(filePath)
146:     
147:     // Remove IMessage import lines
148:     content = REMOVE lines matching "import.*IMessage"
149:     
150:     // Replace IMessage types with Content
151:     content = REPLACE "IMessage" WITH "Content"
152:     content = REPLACE "AsyncIterableIterator<IMessage>" WITH "AsyncIterableIterator<Content>"
153:     
154:     // Add Content import if needed
155:     IF "import.*Content" NOT IN content THEN
156:       content = ADD "import { Content } from '@google/generative-ai';"
157:     END IF
158:     
159:     WRITE file(filePath, content)
160:     
161:     // Verify compilation
162:     result = RUN "npx tsc --noEmit " + filePath
163:     IF result.exitCode != 0 THEN
164:       THROW Error("TypeScript compilation failed for " + filePath)
165:     END IF
166:   END FOR
167: END PROCEDURE
```

## Provider Interface Update

```
168: // REQ-001.1: Add optional sessionId parameter to IProvider interface
169: INTERFACE IProvider
170:   METHOD generateChatCompletion(
171:     contents: Content[],
172:     tools?: ITool[],
173:     toolFormat?: string,
174:     sessionId?: string  // NEW: Optional parameter
175:   ): AsyncIterableIterator<Content>
176: END INTERFACE

177: // Update all provider implementations to match interface
178: PROCEDURE updateProviderImplementations()
179:   providers = [
180:     "packages/core/src/providers/openai/OpenAIProvider.ts",
181:     "packages/core/src/providers/anthropic/AnthropicProvider.ts", 
182:     "packages/core/src/providers/gemini/GeminiProvider.ts"
183:   ]
184:   
185:   FOR EACH providerPath IN providers
186:     // Add sessionId parameter to generateChatCompletion method
187:     UPDATE method signature to include sessionId parameter
188:     
189:     IF provider == "OpenAIProvider" THEN
190:       // Only OpenAI uses sessionId for Responses API
191:       IMPLEMENT sessionId logic for conversation tracking
192:     ELSE
193:       // Other providers ignore sessionId parameter
194:       COMMENT "sessionId parameter unused for this provider"
195:     END IF
196:   END FOR
197: END PROCEDURE
```