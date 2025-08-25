# ToolCallTrackerService Pseudocode

<!--
 * @plan PLAN-20250823-UNIFICATION.P02
 * @requirement REQ-002
 * @requirement REQ-003
 * @pseudocode lines 1-N
 -->

## ToolCallTrackerService Class

1: class ToolCallTrackerService
2:   toolCalls: Map<string, ToolCallInfo>
3:   conversationManager: ConversationManager
4:   
5:   constructor(conversationManager: ConversationManager)
6:     this.toolCalls = new Map()
7:     this.conversationManager = conversationManager
8:   end constructor
9:   
10:   // Track a new tool call
11:   trackToolCall(toolCallInfo: ToolCallInfo): void
12:     this.toolCalls.set(toolCallInfo.id, toolCallInfo)
13:     this.conversationManager.addActiveToolCall(toolCallInfo.conversationId, toolCallInfo)
14:   end trackToolCall
15:   
16:   // Update tool call status
17:   updateToolCallStatus(toolCallId: string, status: 'pending' | 'executing' | 'completed' | 'cancelled' | 'failed'): void
18:     toolCallInfo = this.toolCalls.get(toolCallId)
19:     if (toolCallInfo)
20:       toolCallInfo.status = status
21:       toolCallInfo.timestamp = getCurrentTimestamp()
22:       this.toolCalls.set(toolCallId, toolCallInfo)
23:       
24:       // Update conversation manager based on status
25:       switch (status)
26:         case 'completed':
27:           this.conversationManager.markToolCallCompleted(toolCallInfo.conversationId, toolCallId)
28:         case 'cancelled':
29:           this.conversationManager.markToolCallCancelled(toolCallInfo.conversationId, toolCallId)
30:         case 'failed':
31:           this.conversationManager.markToolCallFailed(toolCallInfo.conversationId, toolCallId)
32:       end switch
33:     end if
34:   end updateToolCallStatus
35:   
36:   // Handle tool call cancellation
37:   cancelToolCall(toolCallId: string): void
38:     toolCallInfo = this.toolCalls.get(toolCallId)
39:     if (toolCallInfo)
40:       this.updateToolCallStatus(toolCallId, 'cancelled')
41:       
42:       // Generate synthetic response for the cancellation
43:       syntheticResponse = this.generateSyntheticCancellationResponse(toolCallInfo)
44:       content = new Content()
45:       content.role = 'user'
46:       content.parts = [new FunctionResponsePart()]
47:       content.parts[0].functionResponse = {
48:         name: toolCallInfo.name,
49:         response: syntheticResponse
50:       }
51:       this.conversationManager.addContent(toolCallInfo.conversationId, content)
52:     end if
53:   end cancelToolCall
54:   
55:   // Generate synthetic response for cancelled tool calls
56:   generateSyntheticCancellationResponse(toolCallInfo: ToolCallInfo): any
57:     adapter = this.getProviderAdapter(toolCallInfo.provider)
58:     return adapter.generateSyntheticCancellationResponse(toolCallInfo)
59:   end generateSyntheticCancellationResponse
60:   
61:   // Validate tool call/response pairs
62:   validateToolCallResponsePair(content: Content): ValidationResult
63:     // Check if content has function call or function response
64:     if (content.parts.some(part => part.functionCall || part.functionResponse))
65:       // Validate the pair matches expected format
66:       return this.toolCallValidator.validate(content)
67:     end if
68:     return { valid: true, message: "No tool call/response to validate" }
69:   end validateToolCallResponsePair
70:   
71:   // Fix malformed tool call/response pairs
72:   fixToolCallResponsePair(content: Content): Content
73:     validation = this.validateToolCallResponsePair(content)
74:     if (!validation.valid)
75:       // Apply fixes based on validation errors
76:       return this.toolCallFixer.fix(content, validation)
77:     end if
78:     return content
79:   end fixToolCallResponsePair
80:   
81:   // Get all tool calls for a conversation
82:   getToolCalls(conversationId: string): ToolCallInfo[]
83:     return Array.from(this.toolCalls.values())
84:       .filter(toolCall => toolCall.conversationId === conversationId)
85:   end getToolCalls
86:   
87:   // Get tool call by ID
88:   getToolCall(toolCallId: string): ToolCallInfo | null
89:     return this.toolCalls.get(toolCallId) || null
90:   end getToolCall
91:   
92: end class