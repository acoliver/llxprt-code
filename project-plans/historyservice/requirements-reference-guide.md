# Requirements Reference Guide

## Purpose
This document ensures all HistoryService documentation properly references and aligns with requirements.md.

## Requirements Traceability Matrix

### Core Documents → Requirements

| Document | Requirements Coverage | Missing References |
|----------|---------------------|-------------------|
| **specification.md** | HS-001 to HS-052 | None - Base document |
| **project-plan.md** | HS-001 to HS-060 | Should reference specific requirements per phase |
| **architecture-diagrams.md** | HS-015 to HS-017 (states), HS-009 to HS-014 (tools) | Should map components to requirements |
| **statemanager-integration.md** | HS-015 to HS-017, HS-036 to HS-045 | Fully mapped |
| **validation.md** | HS-018 to HS-022, HS-042 to HS-044 | Should reference specific validation requirements |

### Implementation Phases → Requirements

| Phase | Primary Requirements | Verification Requirements |
|-------|---------------------|-------------------------|
| **Phase 1-2: Analysis** | All requirements analysis | HS-046 to HS-048 (testing) |
| **Phase 3-5: Core HistoryService** | HS-001 to HS-008 | HS-036 to HS-038 (performance) |
| **Phase 6-8: Message Management** | HS-002, HS-003, HS-059 to HS-061 | HS-042 to HS-044 (reliability) |
| **Phase 9-11: State Machine** | HS-015 to HS-017 | HS-045 (concurrency) |
| **Phase 12-14: Validation** | HS-018 to HS-022 | HS-046 to HS-048 (testing) |
| **Phase 15-17: Tool Management** | HS-009 to HS-014 | HS-042, HS-043 (orphan prevention) |
| **Phase 18-20: Event System** | HS-026 to HS-029 | HS-033 to HS-035 (debug/audit) |
| **Phase 21-26: Integration** | HS-049 to HS-056 | HS-039 to HS-041 (compatibility) |
| **Phase 27-29: Provider Updates** | HS-022, HS-041 | HS-055, HS-056 (API preservation) |
| **Phase 30-32: Final Integration** | HS-054 to HS-056 | All testing requirements |

## Key Requirement Groups

### 1. Core History Management (HS-001 to HS-008)
**Referenced in:**
- specification.md: Section "Core History Management"
- history-service.md (pseudocode): Main class implementation
- Phase 3-5 implementation plans

### 2. Tool Management (HS-009 to HS-014)
**Referenced in:**
- specification.md: Section "Tool Call/Response Management"
- tool-management.md (pseudocode): ToolManager class
- Phase 15-17 implementation plans
- architecture-diagrams.md: Tool flow diagrams

### 3. State Management (HS-015 to HS-017)
**Referenced in:**
- specification.md: Section "State Management"
- state-machine.md (pseudocode): StateManager class
- statemanager-integration.md: Complete integration guide
- Phase 9-11 implementation plans

### 4. Validation (HS-018 to HS-022)
**Referenced in:**
- specification.md: Section "Validation"
- validation.md (pseudocode): Validation methods
- Phase 12-14 implementation plans

### 5. Events (HS-026 to HS-029)
**Referenced in:**
- specification.md: Section "Event System"
- event-system.md (pseudocode): EventSystem class
- Phase 18-20 implementation plans

### 6. Integration (HS-049 to HS-056)
**Referenced in:**
- project-plan.md: Integration phases
- Phase 21-29 implementation plans
- CRITICAL_GAPS_ADDRESSED.md

## Requirement Compliance Checklist

### For New Documents
- [ ] Reference specific requirement IDs (HS-XXX)
- [ ] Map functionality to requirements
- [ ] Include requirements in acceptance criteria
- [ ] Cross-reference with requirements.md

### For Code Implementation
- [ ] Comment requirement IDs in code
- [ ] Test cases reference requirements
- [ ] Validation matches requirement specs
- [ ] Performance meets NFR requirements

### For Verification Phases
- [ ] Each verification references tested requirements
- [ ] All requirements have verification coverage
- [ ] Failed verifications link to requirement violations
- [ ] Success criteria match requirement definitions

## Critical Requirements Not to Miss

### Always Remember:
1. **HS-011**: Tool calls/responses NEVER added separately
2. **HS-022**: HistoryService has NO provider knowledge
3. **HS-042/043**: NEVER create orphaned tools
4. **HS-044**: Maintain consistency on failure
5. **HS-055**: Maintain ALL existing APIs

### Performance Requirements:
- **HS-036**: Handle 1000+ messages
- **HS-037**: O(1) recent message retrieval
- **HS-038**: O(n) validation operations

### Integration Requirements:
- **HS-049**: GeminiChat integration without major refactoring
- **HS-050**: CoreToolScheduler callback pattern support
- **HS-051**: Turn class tool execution flow
- **HS-052**: Client.ts compression workflow

## Requirement Validation Commands

### Check Requirement Coverage
```bash
# Find all requirement references in documentation
grep -r "HS-[0-9]\{3\}" /Users/acoliver/projects/claude-llxprt/llxprt-code/project-plans/historyservice/

# Check specific requirement usage
grep -r "HS-011" /Users/acoliver/projects/claude-llxprt/llxprt-code/project-plans/historyservice/

# Find documents without requirement references
find /Users/acoliver/projects/claude-llxprt/llxprt-code/project-plans/historyservice -name "*.md" -exec sh -c 'grep -L "HS-[0-9]\{3\}" "$1"' _ {} \;
```

### Requirement Implementation Status
```bash
# Check implementation status in phase files
for i in {01..32}; do
  echo "Phase $i:"
  grep "HS-[0-9]\{3\}" /Users/acoliver/projects/claude-llxprt/llxprt-code/project-plans/historyservice/plan/$i*.md | head -3
done
```

## Document Update Guidelines

When updating any HistoryService document:

1. **Check requirements.md first** - Ensure understanding of requirements
2. **Reference specific requirements** - Use HS-XXX format
3. **Update this guide** - Add new document mappings
4. **Verify alignment** - Run validation commands
5. **Document gaps** - Note any unaddressed requirements

## Requirements Not Yet Fully Addressed

### Compression (HS-030 to HS-032)
- Specified but implementation deferred
- Interface defined in specification.md
- No implementation phases yet

### Debug/Audit (HS-033 to HS-035)
- Partially addressed in event system
- Need explicit debug/audit implementation
- Metadata tracking not fully specified

These should be addressed in future iterations or enhancement phases.