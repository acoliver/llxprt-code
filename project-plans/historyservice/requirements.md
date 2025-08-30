# HistoryService Requirements

## Functional Requirements

### Core History Management

**HS-001** The HistoryService SHALL maintain a single authoritative array of conversation history entries.

**HS-002** The HistoryService SHALL provide methods to add user messages to the history.

**HS-003** The HistoryService SHALL provide methods to add model messages to the history.

**HS-004** The HistoryService SHALL prevent direct external access to the internal history array.

**HS-005** The HistoryService SHALL provide a method to retrieve the complete history.

**HS-006** The HistoryService SHALL provide a method to retrieve curated history (filtered for invalid/empty content).

**HS-007** The HistoryService SHALL provide methods to retrieve the last message, last user message, and last model message.

**HS-008** The HistoryService SHALL provide a method to clear all history.

### Tool Call/Response Management

**HS-009** The HistoryService SHALL provide a method to add pending tool calls without immediately adding them to history.

**HS-010** The HistoryService SHALL provide a method to commit tool calls and their responses atomically to history.

**HS-011** The HistoryService SHALL ensure tool calls and responses are NEVER added to history separately.

**HS-012** The HistoryService SHALL provide a method to abort pending tool calls without adding them to history.

**HS-013** The HistoryService SHALL maintain tool call/response pairs with matching IDs.

**HS-014** The HistoryService SHALL support multiple parallel tool calls from a single model message.

### State Management

**HS-015** The HistoryService SHALL track the current conversation state (IDLE, MODEL_RESPONDING, TOOLS_PENDING, TOOLS_EXECUTING).

**HS-016** The HistoryService SHALL prevent invalid operations based on current state.

**HS-017** The HistoryService SHALL transition states automatically based on operations performed.

### Validation

**HS-018** The HistoryService SHALL provide validation to detect orphaned tool calls (calls without responses).

**HS-019** The HistoryService SHALL provide validation to detect orphaned tool responses (responses without calls).

**HS-020** The HistoryService SHALL validate that tool response IDs match existing tool call IDs.

**HS-021** The HistoryService SHALL provide a method to validate the overall history structure.

**HS-022** The HistoryService SHALL NOT have knowledge of specific provider requirements.

### Error Handling

**HS-023** The HistoryService SHALL provide a method to conditionally remove the last history entry only if it matches expected content.

**HS-024** The HistoryService SHALL NOT automatically remove tool responses from history on error.

**HS-025** The HistoryService SHALL preserve tool responses in history even when the model returns an empty response.

### ~~Event System~~ [REMOVED - UNNECESSARY HALLUCINATION]

**~~HS-026~~** ~~The HistoryService SHALL emit events when history is modified (add, remove, clear).~~ **[REMOVED: No production code uses events]**

**~~HS-027~~** ~~The HistoryService SHALL emit events when a conversation turn is completed.~~ **[REMOVED: No production code uses events]**

**~~HS-028~~** ~~The HistoryService SHALL emit events when tool calls and responses are committed.~~ **[REMOVED: No production code uses events]**

**~~HS-029~~** ~~The HistoryService SHALL allow external components to subscribe to history events.~~ **[REMOVED: No production code ever subscribed]**

**Note:** The event system was removed as it was overengineering for imaginary requirements. Orphan tool prevention works perfectly through direct validation in `commitToolResponses()`. See `EVENTS-WERE-UNNECESSARY.md` for details.

### Compression Support

**HS-030** The HistoryService SHALL provide a method to compress history before a specified index.

**HS-031** The HistoryService SHALL maintain conversation continuity after compression.

**HS-032** The compression feature SHALL be initially disabled but fully implemented.

### Debug and Audit

**HS-033** The HistoryService SHALL log all history modifications with context using DebugLogger.

**HS-034** The HistoryService SHALL provide a method to dump the complete history for debugging.

**HS-035** The HistoryService SHALL include metadata about when and why each entry was added.

## Non-Functional Requirements

### Performance

**HS-036** The HistoryService SHALL handle history arrays of at least 1000 messages without performance degradation.

**HS-037** History retrieval operations SHALL complete in O(1) time for recent messages.

**HS-038** Validation operations SHALL complete in O(n) time where n is the history length.

### Compatibility

**HS-039** The HistoryService SHALL work with both interactive and non-interactive modes.

**HS-040** The HistoryService SHALL maintain backward compatibility with existing Content and Part interfaces.

**HS-041** The HistoryService SHALL not require changes to existing provider implementations.

### Reliability

**HS-042** The HistoryService SHALL never create orphaned tool calls in the history.

**HS-043** The HistoryService SHALL never create orphaned tool responses in the history.

**HS-044** The HistoryService SHALL maintain history consistency even when operations fail.

**HS-045** The HistoryService SHALL handle concurrent operations safely.

### Testing

**HS-046** The HistoryService SHALL be fully unit testable without external dependencies.

**HS-047** The HistoryService SHALL provide test utilities for validating history states.

**HS-048** All public methods of the HistoryService SHALL have test coverage.

### Integration

**HS-049** The HistoryService SHALL integrate with GeminiChat without requiring major refactoring.

**HS-050** The HistoryService SHALL integrate with the existing CoreToolScheduler callback pattern.

**HS-051** The HistoryService SHALL work with the existing Turn class tool execution flow.

**HS-052** The HistoryService SHALL support the existing compression workflow in Client.ts.

## Integration Requirements

**HS-054** The integration SHALL be possible to complete incrementally without breaking functionality.

**HS-055** The integration SHALL maintain all existing public APIs of GeminiChat.

**HS-056** The integration SHALL not require changes to UI components.

## Constraints

**HS-057** The HistoryService SHALL use TypeScript with strict type checking.

**HS-058** The HistoryService SHALL not introduce new external dependencies.

**HS-059** The HistoryService SHALL follow existing project coding standards.

**HS-060** The HistoryService SHALL use the existing DebugLogger for all logging.