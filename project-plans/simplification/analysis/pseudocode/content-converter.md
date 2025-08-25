# Pseudocode: Content Converter Components

## IContentConverter Interface

```
01: INTERFACE IContentConverter
02:   METHOD toProviderFormat(contents: Content[]): unknown
03:   METHOD fromProviderFormat(response: unknown): Content
04: END INTERFACE
```

## OpenAIContentConverter

```
10: CLASS OpenAIContentConverter IMPLEMENTS IContentConverter
11:   
12:   METHOD toProviderFormat(contents: Content[]): OpenAIMessage[]
13:     INITIALIZE messages as empty array
14:     INITIALIZE pendingToolCalls as Map<string, ToolCall>
15:     
16:     FOR each content in contents
17:       IF content.role equals "user"
18:         FOR each part in content.parts
19:           IF part has text
20:             ADD OpenAIMessage with role="user", content=part.text to messages
21:           ELSE IF part has functionResponse
22:             ADD OpenAIMessage with role="tool", tool_call_id=part.functionResponse.id to messages
23:           END IF
24:         END FOR
25:       ELSE IF content.role equals "model"
26:         INITIALIZE textParts as empty array
27:         INITIALIZE toolCalls as empty array
28:         
29:         FOR each part in content.parts
30:           IF part has text
31:             APPEND part.text to textParts
32:           ELSE IF part has functionCall
33:             CREATE toolCall with id, name, arguments
34:             ADD toolCall to toolCalls
35:             STORE in pendingToolCalls map
36:           END IF
37:         END FOR
38:         
39:         IF textParts not empty OR toolCalls not empty
40:           CREATE message with role="assistant"
41:           IF textParts not empty
42:             SET message.content = JOIN textParts
43:           END IF
44:           IF toolCalls not empty
45:             SET message.tool_calls = toolCalls
46:           END IF
47:           ADD message to messages
48:         END IF
49:       END IF
50:     END FOR
51:     
52:     RETURN messages
53:   END METHOD
54:   
55:   METHOD fromProviderFormat(response: OpenAIResponse): Content
56:     INITIALIZE parts as empty array
57:     
58:     IF response.choices exists and not empty
59:       SET choice = response.choices[0]
60:       
61:       IF choice.message.content exists
62:         ADD text part with choice.message.content to parts
63:       END IF
64:       
65:       IF choice.message.tool_calls exists
66:         FOR each toolCall in choice.message.tool_calls
67:           CREATE functionCall part with name and args
68:           ADD functionCall part to parts
69:         END FOR
70:       END IF
71:     END IF
72:     
73:     RETURN Content with role="model" and parts
74:   END METHOD
75: END CLASS
```

## AnthropicContentConverter

```
80: CLASS AnthropicContentConverter IMPLEMENTS IContentConverter
81:   
82:   METHOD toProviderFormat(contents: Content[]): AnthropicMessage[]
83:     INITIALIZE messages as empty array
84:     INITIALIZE lastRole as null
85:     INITIALIZE currentMessage as null
86:     
87:     FOR each content in contents
88:       SET anthropicRole = MAP content.role to Anthropic role
89:       
90:       IF anthropicRole not equals lastRole
91:         IF currentMessage exists
92:           ADD currentMessage to messages
93:         END IF
94:         CREATE new currentMessage with role=anthropicRole
95:         SET lastRole = anthropicRole
96:       END IF
97:       
98:       FOR each part in content.parts
99:         IF part has text
100:          APPEND text to currentMessage.content
101:        ELSE IF part has functionCall
102:          CREATE tool_use block
103:          APPEND tool_use to currentMessage.content
104:        ELSE IF part has functionResponse
105:          CREATE tool_result block
106:          APPEND tool_result to currentMessage.content
107:        END IF
108:      END FOR
109:    END FOR
110:    
111:    IF currentMessage exists
112:      ADD currentMessage to messages
113:    END IF
114:    
115:    RETURN messages
116:  END METHOD
117:  
118:  METHOD fromProviderFormat(response: AnthropicResponse): Content
119:    INITIALIZE parts as empty array
120:    
121:    IF response.content exists
122:      FOR each block in response.content
123:        IF block.type equals "text"
124:          ADD text part with block.text to parts
125:        ELSE IF block.type equals "tool_use"
126:          CREATE functionCall part
127:          ADD functionCall part to parts
128:        END IF
129:      END FOR
130:    END IF
131:    
132:    RETURN Content with role="model" and parts
133:  END METHOD
134: END CLASS
```

## Provider Integration

```
140: CLASS OpenAIProvider
141:   PRIVATE converter: OpenAIContentConverter
142:   
143:   METHOD constructor()
144:     SET this.converter = new OpenAIContentConverter()
145:   END METHOD
146:   
147:   METHOD generateContent(contents: Content[], config: Config): AsyncIterable<Content>
148:     // Convert Content[] to OpenAI format
149:     SET messages = this.converter.toProviderFormat(contents)
150:     
151:     // Make API call
152:     SET stream = await this.openai.chat.completions.create({
153:       model: config.model,
154:       messages: messages,
155:       stream: true
156:     })
157:     
158:     // Stream responses
159:     FOR each chunk in stream
160:       SET content = this.converter.fromProviderFormat(chunk)
161:       YIELD content
162:     END FOR
163:   END METHOD
164: END CLASS
```

## GeminiCompatibleWrapper Changes

```
170: CLASS GeminiCompatibleWrapper
171:   
172:   METHOD generateContentStream(request: GenerateContentParameters)
173:     // Extract Content[] directly from request
174:     SET contents = request.contents
175:     
176:     // Pass Content[] to provider (no IMessage conversion)
177:     SET provider = this.provider
178:     
179:     // Provider now accepts Content[] directly
180:     FOR each response in provider.generateContent(contents, request.config)
181:       YIELD response
182:     END FOR
183:   END METHOD
184: END CLASS
```