# ConversationManager Pseudocode

<!--
 * @plan PLAN-20250823-UNIFICATION.P02
 * @requirement REQ-001
 * @requirement REQ-003
 * @requirement REQ-004
 * @pseudocode lines 1-N
 -->

## ConversationManager Class

1: class ConversationManager
2:   conversationStorage: Map<string, ConversationContext>
3:   settingsService: SettingsService
4:   tokenCounter: TokenCounterService
5: 
6:   constructor(settingsService: SettingsService)
7:     this.settingsService = settingsService
8:     this.conversationStorage = new Map()
9:     this.tokenCounter = new TokenCounterService()
10:   end constructor
11: 
12:   // Conversation Management Methods
13:   
14:   // Create or get a conversation context
15:   getOrCreateConversation(conversationId: string): ConversationContext
16:     if (!this.conversationStorage.has(conversationId))
17:       conversationContext = new ConversationContext()
18:       conversationContext.conversationId = conversationId
19:       conversationContext.contents = []
20:       conversationContext.tokenCount = 0
21:       conversationContext.activeToolCalls = new Map()
22:       conversationContext.completedToolCalls = new Set()
23:       conversationContext.cancelledToolCalls = new Set()
24:       conversationContext.metadata = {}
25:       this.conversationStorage.set(conversationId, conversationContext)
26:     end if
27:     return this.conversationStorage.get(conversationId)
28:   end getOrCreateConversation
29: 
30:   // Add content to conversation and update token count
31:   addContent(conversationId: string, content: Content): void
32:     conversation = this.getOrCreateConversation(conversationId)
33:     conversation.contents.push(content)
34:     conversation.tokenCount = this.tokenCounter.countTokens(conversation.contents)
35:     this.conversationStorage.set(conversationId, conversation)
36:     
37:     // Check compression threshold
38:     if (conversation.tokenCount > this.settingsService.getCompressionThreshold())
39:       this.compressConversation(conversationId)
40:     end if
41:   end addContent
42: 
43:   // Get conversation in Gemini format (lingua franca)
44:   getConversation(conversationId: string): Content[]
45:     conversation = this.getOrCreateConversation(conversationId)
46:     return conversation.contents
47:   end getConversation
48: 
49:   // Get conversation in provider-specific format
50:   getConversationForProvider(conversationId: string, provider: string): any
51:     conversation = this.getOrCreateConversation(conversationId)
52:     adapter = this.getProviderAdapter(provider)
53:     return adapter.toProviderFormat(conversation.contents)
54:   end getConversationForProvider
55: 
56:   // Clear conversation history
57:   clearConversation(conversationId: string): void
58:     conversation = this.getOrCreateConversation(conversationId)
59:     conversation.contents = []
60:     conversation.tokenCount = 0
61:     conversation.activeToolCalls.clear()
62:     conversation.completedToolCalls.clear()
63:     conversation.cancelledToolCalls.clear()
64:     this.conversationStorage.set(conversationId, conversation)
65:   end clearConversation
66: 
67:   // Validate content for meaningful information
68:   isMeaningfulContent(content: Content): boolean
69:     return this.meaningfulContentDetector.isMeaningful(content)
70:   end isMeaningfulContent
71: 
72:   // Compress conversation when token threshold exceeded
73:   compressConversation(conversationId: string): void
74:     conversation = this.getOrCreateConversation(conversationId)
75:     compressedContents = this.compressionService.compress(conversation.contents)
76:     conversation.contents = compressedContents
77:     conversation.tokenCount = this.tokenCounter.countTokens(conversation.contents)
78:     this.conversationStorage.set(conversationId, conversation)
79:   end compressConversation
80: 
81:   // Tool Call Management Methods
82:   
83:   // Add a tool call to active tracking
84:   addActiveToolCall(conversationId: string, toolCallInfo: ToolCallInfo): void
85:     conversation = this.getOrCreateConversation(conversationId)
86:     conversation.activeToolCalls.set(toolCallInfo.id, toolCallInfo)
87:     this.conversationStorage.set(conversationId, conversation)
88:   end addActiveToolCall
89: 
90:   // Mark a tool call as completed
91:   markToolCallCompleted(conversationId: string, toolCallId: string): void
92:     conversation = this.getOrCreateConversation(conversationId)
93:     toolCallInfo = conversation.activeToolCalls.get(toolCallId)
94:     if (toolCallInfo)
95:       conversation.activeToolCalls.delete(toolCallId)
96:       conversation.completedToolCalls.add(toolCallId)
97:       this.conversationStorage.set(conversationId, conversation)
98:     end if
99:   end markToolCallCompleted
100: 
101:   // Mark a tool call as cancelled
102:   markToolCallCancelled(conversationId: string, toolCallId: string): void
103:     conversation = this.getOrCreateConversation(conversationId)
104:     toolCallInfo = conversation.activeToolCalls.get(toolCallId)
105:     if (toolCallInfo)
106:       conversation.activeToolCalls.delete(toolCallId)
107:       conversation.cancelledToolCalls.add(toolCallId)
108:       this.conversationStorage.set(conversationId, conversation)
109:     end if
110:   end markToolCallCancelled
111: 
112:   // Mark a tool call as failed
113:   markToolCallFailed(conversationId: string, toolCallId: string): void
114:     conversation = this.getOrCreateConversation(conversationId)
115:     toolCallInfo = conversation.activeToolCalls.get(toolCallId)
116:     if (toolCallInfo)
117:       conversation.activeToolCalls.delete(toolCallId)
118:       // Failed tool calls are not tracked in completed or cancelled sets
119:       this.conversationStorage.set(conversationId, conversation)
120:     end if
121:   end markToolCallFailed
122: 
123:   // Get pending tool calls
124:   getActiveToolCalls(conversationId: string): ToolCallInfo[]
125:     conversation = this.getOrCreateConversation(conversationId)
126:     return Array.from(conversation.activeToolCalls.values())
127:   end getActiveToolCalls
128:   
129: end class