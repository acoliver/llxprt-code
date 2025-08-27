# Requirements to Phase Mapping

## REQ-001: SessionId Parameter Flow

### REQ-001.1: Add optional sessionId parameter to IProvider.generateChatCompletion()
- **Phase 03**: Interface stub - Add parameter
- **Phase 04**: Interface TDD - Test parameter acceptance
- **Phase 05**: Interface impl - Verify working
- **Tests**: Behavioral test that provider accepts sessionId

### REQ-001.2: GeminiChat retrieves sessionId via config.getSessionId() and passes to ContentGenerator
- **Phase 12**: Integration stub - Wire sessionId retrieval
- **Phase 13**: Integration TDD - Test sessionId flow
- **Phase 14**: Integration impl - Complete flow
- **Pseudocode**: Lines 152-153, 158-159
- **Tests**: Behavioral test that sessionId flows from config to ContentGenerator

### REQ-001.3: ContentGenerator passes sessionId to provider as parameter
- **Phase 03**: Interface stub - Update callers
- **Phase 12**: Integration stub - Real values
- **Phase 14**: Integration impl - Complete
- **Pseudocode**: Lines 175-181
- **Tests**: Behavioral test that ContentGenerator passes sessionId

### REQ-001.4: OpenAIProvider uses sessionId as conversation_id for Responses API
- **Phase 07**: Provider TDD - Test conversation_id usage
- **Phase 08**: Provider impl - Implement usage
- **Pseudocode**: Lines 17-23, 62
- **Tests**: Behavioral test that conversation_id equals sessionId

### REQ-001.5: Generate temporary ID if sessionId not provided
- **Phase 07**: Provider TDD - Test temp ID generation
- **Phase 08**: Provider impl - Implement generation
- **Pseudocode**: Lines 21-22
- **Tests**: Behavioral test that temp ID generated when sessionId is undefined

## REQ-002: Response ID Tracking via Metadata

### REQ-002.1: Extract response ID from API response.completed event
- **Phase 10**: Response TDD - Test extraction
- **Phase 11**: Response impl - Implement extraction
- **Pseudocode**: Lines 93-95
- **Tests**: Behavioral test that responseId extracted from event

### REQ-002.2: Add responseId to Content metadata before yielding
- **Phase 10**: Response TDD - Test metadata addition
- **Phase 11**: Response impl - Implement addition
- **Pseudocode**: Lines 98-101
- **Tests**: Behavioral test that yielded Content has responseId in metadata

### REQ-002.3: Find previous responseId by searching backwards in contents
- **Phase 07**: Provider TDD - Test lookup
- **Phase 08**: Provider impl - Implement lookup
- **Pseudocode**: Lines 40-52
- **Tests**: Behavioral test that finds responseId in message history

### REQ-002.4: Use null as previous_response_id when no responseId found
- **Phase 07**: Provider TDD - Test null handling
- **Phase 08**: Provider impl - Implement null return
- **Pseudocode**: Lines 54-55, 65
- **Tests**: Behavioral test that returns null when no responseId

## REQ-003: Content Format Unification

### REQ-003.1: Delete IMessage interface completely
- **Phase 15**: Migration stub - Identify imports
- **Phase 16**: Migration TDD - Test removal
- **Phase 17**: Migration impl - Remove imports
- **Pseudocode**: Lines 205-224
- **Tests**: Behavioral test that no IMessage imports remain

### REQ-003.2: Convert parseResponsesStream to return Content[] not IMessage
- **Phase 09**: Response stub - Change return type
- **Phase 10**: Response TDD - Test Content return
- **Phase 11**: Response impl - Implement conversion
- **Pseudocode**: Lines 103-104, 113-114
- **Tests**: Behavioral test that returns Content objects

### REQ-003.3: Add metadata field to returned Content
- **Phase 10**: Response TDD - Test metadata field
- **Phase 11**: Response impl - Add metadata
- **Pseudocode**: Lines 101
- **Tests**: Behavioral test that Content has metadata field

### REQ-003.4: Preserve existing Content structure
- **Phase 09-11**: Response phases - Don't modify Google's type
- **Tests**: Behavioral test that Content structure unchanged

## REQ-INT-001: Integration Requirements

### REQ-INT-001.1: Provider remains stateless - sessionId only as parameter
- **Phase 06-08**: Provider phases - No sessionId storage
- **Tests**: Behavioral test that provider has no sessionId field

### REQ-INT-001.2: Metadata flows through existing wrapper/history unchanged
- **Phase 12-14**: Integration phases - Preserve flow
- **Pseudocode**: Lines 185-202
- **Tests**: Behavioral test that metadata preserved

### REQ-INT-001.3: Work with existing save/load functionality
- **Phase 18**: E2E tests - Verify save/load
- **Tests**: Behavioral test that save/load preserves responseId

### REQ-INT-001.4: Support provider switching
- **Phase 18**: E2E tests - Test switching
- **Tests**: Behavioral test that switching resets chain

## Coverage Summary

✅ All requirements have:
- Specific implementation phases
- Pseudocode line references where applicable
- Behavioral tests defined
- Clear success criteria

✅ By Phase 40, all requirements will be:
- Fully implemented across all components
- Tested with behavioral tests (100% requirements coverage)
- Verified with mutation testing (80% minimum score)
- Property-based testing (30% minimum coverage)
- Integrated into existing system
- All IMessage imports removed
- End-to-end tests passing
- Performance verified
- Documentation complete