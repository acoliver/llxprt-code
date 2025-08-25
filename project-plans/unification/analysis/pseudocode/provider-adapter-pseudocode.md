# Provider Adapter Pseudocode

<!--
 * @plan PLAN-20250823-UNIFICATION.P02
 * @requirement REQ-001
 * @requirement REQ-002
 * @requirement REQ-003
 * @requirement REQ-004
 * @pseudocode lines 1-N
 -->

## Base ProviderAdapter Class

1: abstract class ProviderAdapter
2:   // Convert from provider format to Gemini Content format
3:   abstract toGeminiFormat(providerContent: any): Content
4:   
5:   // Convert from Gemini Content format to provider format
6:   abstract toProviderFormat(geminiContents: Content[]): any
7:   
8:   // Generate synthetic cancellation response for this provider
9:   abstract generateSyntheticCancellationResponse(toolCallInfo: ToolCallInfo): any
10:   
11:   // Validate tool call/response pairs for this provider
12:   abstract validateToolCallResponsePair(content: Content): ValidationResult
13:   
14:   // Fix tool call/response pairs for this provider
15:   abstract fixToolCallResponsePair(content: Content): Content
16: end class

## OpenAIAdapter Implementation

17: class OpenAIAdapter extends ProviderAdapter
18:   // Convert OpenAI format to Gemini Content
19:   toGeminiFormat(openAIContent: OpenAI.Chat.ChatCompletionMessage): Content
20:     geminiContent = new Content()
21:     geminiContent.role = this.mapRole(openAIContent.role)
22:     
23:     // Handle text content
24:     if (openAIContent.content)
25:       geminiContent.parts = [{ text: openAIContent.content }]
26:     end if
27:     
28:     // Handle tool calls
29:     if (openAIContent.tool_calls)
30:       if (!geminiContent.parts)
31:         geminiContent.parts = []
32:       end if
33:       for tool_call in openAIContent.tool_calls
34:         geminiContent.parts.push({
35:           functionCall: {
36:             name: tool_call.function.name,
37:             args: tool_call.function.arguments
38:           }
39:         })
40:       end for
41:     end if
42:     
43:     return geminiContent
44:   end toGeminiFormat
45:   
46:   // Convert Gemini Content to OpenAI format
47:   toProviderFormat(geminiContents: Content[]): OpenAI.Chat.ChatCompletionMessageParam[]
48:     openAIMessages = []
49:     for content in geminiContents
50:       openAIMessage = {
51:         role: this.mapRole(content.role),
52:         content: null
53:       }
54:       
55:       // Handle text parts
56:       textParts = content.parts.filter(part => part.text)
57:       if (textParts.length > 0)
58:         openAIMessage.content = textParts.map(part => part.text).join('\n')
59:       end if
60:       
61:       // Handle function calls
62:       functionCallParts = content.parts.filter(part => part.functionCall)
63:       if (functionCallParts.length > 0)
64:         openAIMessage.tool_calls = functionCallParts.map(part => ({
65:           id: generateToolCallId(),
66:           type: "function",
67:           function: {
68:             name: part.functionCall.name,
69:             arguments: part.functionCall.args
70:           }
71:         }))
72:       end if
73:       
74:       // Handle function responses
75:       functionResponseParts = content.parts.filter(part => part.functionResponse)
76:       if (functionResponseParts.length > 0)
77:         openAIMessage.content = functionResponseParts.map(part => 
78:           JSON.stringify(part.functionResponse.response)
79:         ).join('\n')
80:       end if
81:       
82:       openAIMessages.push(openAIMessage)
83:     end for
84:     return openAIMessages
85:   end toProviderFormat
86:   
87:   // Map roles between OpenAI and Gemini
88:   mapRole(role: string): string
89:     switch (role)
90:       case 'user', 'assistant', 'system', 'function', 'tool':
91:         return role
92:       default:
93:         return 'user'
94:     end switch
95:   end mapRole
96:   
97:   // Generate synthetic cancellation response
98:   generateSyntheticCancellationResponse(toolCallInfo: ToolCallInfo): any
99:     return {
100:       error: "Tool call was cancelled by user",
101:       cancelled_at: toolCallInfo.timestamp
102:     }
103:   end generateSyntheticCancellationResponse
104:   
105:   // Validate tool call/response pair
106:   validateToolCallResponsePair(content: Content): ValidationResult
107:     // OpenAI specific validation logic
108:     return openAIValidator.validate(content)
109:   end validateToolCallResponsePair
110:   
111:   // Fix tool call/response pair
112:   fixToolCallResponsePair(content: Content): Content
113:     // OpenAI specific fixing logic
114:     return openAIFixer.fix(content)
115:   end fixToolCallResponsePair
116: end class

## AnthropicAdapter Implementation

117: class AnthropicAdapter extends ProviderAdapter
118:   // Convert Anthropic format to Gemini Content
119:   toGeminiFormat(anthropicContent: Anthropic.Messages.Message): Content
120:     geminiContent = new Content()
121:     geminiContent.role = this.mapRole(anthropicContent.role)
122:     
123:     // Handle text content
124:     if (anthropicContent.content)
125:       geminiContent.parts = [{ text: anthropicContent.content }]
126:     end if
127:     
128:     return geminiContent
129:   end toGeminiFormat
130:   
131:   // Convert Gemini Content to Anthropic format
132:   toProviderFormat(geminiContents: Content[]): Anthropic.Messages.MessageParam[]
133:     anthropicMessages = []
134:     for content in geminiContents
135:       anthropicMessage = {
136:         role: this.mapRole(content.role),
137:         content: null
138:       }
139:       
140:       // Handle text parts
141:       textParts = content.parts.filter(part => part.text)
142:       if (textParts.length > 0)
143:         anthropicMessage.content = textParts.map(part => part.text).join('\n')
144:       end if
145:       
146:       // Handle function calls (tools in Anthropic)
147:       functionCallParts = content.parts.filter(part => part.functionCall)
148:       if (functionCallParts.length > 0)
149:         // Anthropic tool usage format
150:         for part in functionCallParts
151:           anthropicMessage.content = [{
152:             type: "tool_use",
153:             id: generateToolCallId(),
154:             name: part.functionCall.name,
155:             input: JSON.parse(part.functionCall.args)
156:           }]
157:         end for
158:       end if
159:       
160:       // Handle function responses
161:       functionResponseParts = content.parts.filter(part => part.functionResponse)
162:       if (functionResponseParts.length > 0)
163:         anthropicMessage.content = functionResponseParts.map(part => ({
164:           type: "tool_result",
165:           tool_use_id: part.functionResponse.name, // Would need proper ID mapping
166:           content: JSON.stringify(part.functionResponse.response)
167:         }))
168:       end if
169:       
170:       anthropicMessages.push(anthropicMessage)
171:     end for
172:     return anthropicMessages
173:   end toProviderFormat
174:   
175:   // Map roles between Anthropic and Gemini
176:   mapRole(role: string): string
177:     switch (role)
178:       case 'user', 'assistant':
179:         return role
180:       default:
181:         return 'user'
182:     end switch
183:   end mapRole
184:   
185:   // Generate synthetic cancellation response
186:   generateSyntheticCancellationResponse(toolCallInfo: ToolCallInfo): any
187:     return {
188:       error: "Tool call was cancelled by user",
189:       cancelled_at: toolCallInfo.timestamp,
190:       is_cancelled: true
191:     }
192:   end generateSyntheticCancellationResponse
193:   
194:   // Validate tool call/response pair
195:   validateToolCallResponsePair(content: Content): ValidationResult
196:     // Anthropic specific validation logic
197:     return anthropicValidator.validate(content)
198:   end validateToolCallResponsePair
199:   
200:   // Fix tool call/response pair
201:   fixToolCallResponsePair(content: Content): Content
202:     // Anthropic specific fixing logic
203:     return anthropicFixer.fix(content)
204:   end fixToolCallResponsePair
205: end class

## GeminiAdapter Implementation

206: class GeminiAdapter extends ProviderAdapter
207:   // Convert Gemini format to Gemini Content (identity operation)
208:   toGeminiFormat(geminiContent: Content): Content
209:     return geminiContent
210:   end toGeminiFormat
211:   
212:   // Convert Gemini Content to Gemini format (identity operation)
213:   toProviderFormat(geminiContents: Content[]): Content[]
214:     return geminiContents
215:   end toProviderFormat
216:   
217:   // Generate synthetic cancellation response
218:   generateSyntheticCancellationResponse(toolCallInfo: ToolCallInfo): any
219:     return {
220:       error: "Tool call was cancelled by user",
221:       cancelled_at: toolCallInfo.timestamp
222:     }
223:   end generateSyntheticCancellationResponse
224:   
225:   // Validate tool call/response pair
226:   validateToolCallResponsePair(content: Content): ValidationResult
227:     // Gemini specific validation logic
228:     return geminiValidator.validate(content)
229:   end validateToolCallResponsePair
230:   
231:   // Fix tool call/response pair
232:   fixToolCallResponsePair(content: Content): Content
233:     // Gemini specific fixing logic
234:     return geminiFixer.fix(content)
235:   end fixToolCallResponsePair
236: end class