# State Management Logic Pseudocode

## StateManager Implementation

```
10: CLASS StateManager
11:   PROPERTIES:
12:     currentState: HistoryState
13:     stateHistory: StateTransition[]
14:     allowedTransitions: Map<HistoryState, HistoryState[]>
15:     eventEmitter: EventEmitter
16: 
17: METHOD constructor()
18:   // @requirement HS-015: Initialize state management
19:   SET this.currentState = READY
20:   SET this.stateHistory = empty array
21:   INITIALIZE this.allowedTransitions with:
22:     READY -> [PROCESSING, TOOLS_PENDING, ERROR]
23:     PROCESSING -> [READY, TOOLS_PENDING, ERROR]
24:     TOOLS_PENDING -> [TOOLS_EXECUTING, READY, ERROR]
25:     TOOLS_EXECUTING -> [TOOLS_COMPLETED, ERROR]
26:     TOOLS_COMPLETED -> [READY, TOOLS_PENDING, ERROR]
27:     ERROR -> [READY]
28:   INITIALIZE this.eventEmitter
29:   RECORD initial state transition
30: END METHOD
31: 
32: METHOD transitionTo(newState: HistoryState, context?: StateContext)
33:   // @requirement HS-016: Handle state transitions
34:   BEGIN TRANSACTION
35:   TRY
36:     VALIDATE newState is valid enum value
37:     IF newState not in HistoryState enum
38:       THROW ValidationError("Invalid state: " + newState)
39:     END IF
40:     GET allowedStates = this.allowedTransitions.get(this.currentState)
41:     IF newState not in allowedStates
42:       THROW StateTransitionError("Invalid transition from " + this.currentState + " to " + newState)
43:     END IF
44:     STORE previousState = this.currentState
45:     CREATE transition record with:
46:       fromState: previousState
47:       toState: newState
48:       timestamp: currentTimestamp()
49:       context: context or null
50:       triggeredBy: context?.triggeredBy or "system"
51:     ADD transition to this.stateHistory
52:     SET this.currentState = newState
53:     EMIT StateChanged event with transition details
54:     CALL this.onStateEnter(newState, previousState, context)
55:     COMMIT TRANSACTION
56:     RETURN transition
57:   CATCH error
58:     ROLLBACK TRANSACTION
59:     EMIT StateTransitionError event with error
60:     THROW error
61:   END TRY
62: END METHOD
63: 
64: METHOD getCurrentState()
65:   // @requirement HS-016: Get current state
66:   RETURN this.currentState
67: END METHOD
68: 
69: METHOD getStateHistory()
70:   // @requirement HS-016: Get state transition history
71:   RETURN deep copy of this.stateHistory
72: END METHOD
73: 
74: METHOD canTransitionTo(targetState: HistoryState)
75:   // @requirement HS-016: Check if transition is allowed
76:   VALIDATE targetState is valid enum value
77:   GET allowedStates = this.allowedTransitions.get(this.currentState)
78:   RETURN targetState in allowedStates
79: END METHOD
80: 
81: METHOD validateStateTransition(action: ActionType)
82:   // @requirement HS-017: Validate state allows specific actions
83:   SWITCH action
84:     CASE ADD_MESSAGE:
85:       IF this.currentState in [TOOLS_EXECUTING]
86:         THROW StateError("Cannot add message during tool execution")
87:       END IF
88:     CASE UPDATE_MESSAGE:
89:       IF this.currentState in [TOOLS_EXECUTING]
90:         THROW StateError("Cannot update message during tool execution")
91:       END IF
92:     CASE DELETE_MESSAGE:
93:       IF this.currentState in [TOOLS_EXECUTING]
94:         THROW StateError("Cannot delete message during tool execution")
95:       END IF
96:     CASE CLEAR_HISTORY:
97:       IF this.currentState in [TOOLS_EXECUTING, TOOLS_PENDING]
98:         THROW StateError("Cannot clear history with pending or executing tools")
99:       END IF
100:     CASE ADD_TOOL_CALLS:
101:       IF this.currentState in [TOOLS_EXECUTING]
102:         THROW StateError("Cannot add tool calls during execution")
103:       END IF
104:     CASE EXECUTE_TOOLS:
105:       IF this.currentState != TOOLS_PENDING
106:         THROW StateError("Cannot execute tools without pending calls")
107:       END IF
108:     CASE ADD_TOOL_RESPONSES:
109:       IF this.currentState != TOOLS_EXECUTING
110:         THROW StateError("Cannot add responses without executing tools")
111:       END IF
112:     CASE COMPLETE_TOOLS:
113:       IF this.currentState != TOOLS_EXECUTING
114:         THROW StateError("Cannot complete tools without execution")
115:       END IF
116:     DEFAULT:
117:       // Action allowed in current state
118:       RETURN true
119:   END SWITCH
120:   RETURN true
121: END METHOD
122: 
123: METHOD onStateEnter(newState: HistoryState, previousState: HistoryState, context?: StateContext)
124:   // @requirement HS-017: Handle state entry logic
125:   SWITCH newState
126:     CASE READY:
127:       IF previousState is ERROR
128:         CALL this.handleErrorRecovery(context)
129:       END IF
130:       CALL this.cleanupPendingOperations()
131:     CASE PROCESSING:
132:       CALL this.initializeProcessing(context)
133:     CASE TOOLS_PENDING:
134:       CALL this.preparePendingTools(context)
135:     CASE TOOLS_EXECUTING:
136:       CALL this.initializeToolExecution(context)
137:     CASE TOOLS_COMPLETED:
138:       CALL this.finalizeToolExecution(context)
139:     CASE ERROR:
140:       CALL this.handleError(context)
141:   END SWITCH
142: END METHOD
143: 
144: METHOD handleErrorRecovery(context?: StateContext)
145:   // Helper method for error recovery
146:   LOG "Recovering from error state"
147:   IF context?.error
148:     LOG "Previous error: " + context.error.message
149:   END IF
150:   EMIT ErrorRecoveryStarted event
151: END METHOD
152: 
153: METHOD cleanupPendingOperations()
154:   // Helper method to cleanup when entering READY state
155:   LOG "Cleaning up pending operations"
156:   // Additional cleanup logic as needed
157: END METHOD
158: 
159: METHOD initializeProcessing(context?: StateContext)
160:   // Helper method for PROCESSING state entry
161:   LOG "Initializing processing"
162:   IF context?.operation
163:     LOG "Processing operation: " + context.operation
164:   END IF
165: END METHOD
166: 
167: METHOD preparePendingTools(context?: StateContext)
168:   // Helper method for TOOLS_PENDING state entry
169:   LOG "Preparing pending tool calls"
170:   IF context?.toolCalls
171:     LOG "Tool calls count: " + context.toolCalls.length
172:   END IF
173: END METHOD
174: 
175: METHOD initializeToolExecution(context?: StateContext)
176:   // Helper method for TOOLS_EXECUTING state entry
177:   LOG "Initializing tool execution"
178:   EMIT ToolExecutionStarted event
179: END METHOD
180: 
181: METHOD finalizeToolExecution(context?: StateContext)
182:   // Helper method for TOOLS_COMPLETED state entry
183:   LOG "Finalizing tool execution"
184:   IF context?.results
185:     LOG "Tool execution results: " + context.results.length
186:   END IF
187:   EMIT ToolExecutionCompleted event
188: END METHOD
189: 
190: METHOD handleError(context?: StateContext)
191:   // Helper method for ERROR state entry
192:   LOG "Entering error state"
193:   IF context?.error
194:     LOG "Error details: " + context.error.message
195:     EMIT ErrorOccurred event with error details
196:   END IF
197: END METHOD
198: 
199: METHOD resetState()
200:   // Reset to initial state (for testing/recovery)
201:   STORE previousState = this.currentState
202:   SET this.currentState = READY
203:   CREATE reset transition record with:
204:     fromState: previousState
205:     toState: READY
206:     timestamp: currentTimestamp()
207:     context: { triggeredBy: "reset" }
208:   ADD reset transition to this.stateHistory
209:   EMIT StateReset event
210:   RETURN true
211: END METHOD
212: 
213: METHOD getStateStatistics()
214:   // Get statistics about state transitions
215:   INITIALIZE stateCount = empty map
216:   INITIALIZE transitionCount = empty map
217:   FOR each transition in this.stateHistory
218:     INCREMENT stateCount[transition.toState]
219:     SET transitionKey = transition.fromState + "->" + transition.toState
220:     INCREMENT transitionCount[transitionKey]
221:   END FOR
222:   CALCULATE totalTransitions = this.stateHistory.length
223:   CALCULATE currentStateDuration = currentTimestamp() - last transition timestamp
224:   RETURN object with:
225:     currentState: this.currentState
226:     totalTransitions: totalTransitions
227:     stateCount: stateCount
228:     transitionCount: transitionCount
229:     currentStateDuration: currentStateDuration
230:     stateHistory: this.stateHistory
231: END METHOD
232: 
233: END CLASS
```