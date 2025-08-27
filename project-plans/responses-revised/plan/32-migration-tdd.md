# Phase 32: Migration TDD

## Phase ID
`PLAN-20250826-RESPONSES.P32`

## Task Description
Write tests for IMessage import removal migration.

## Dependencies
- Phase 31 completed

## Test Requirements
1. **REQ-003.1**: Test IMessage imports removed
2. **REQ-003.2**: Test Content imports added
3. Test type replacements work
4. Property tests for migration safety

## Test Approach
```typescript
describe('IMessage migration', () => {
  it('should remove all IMessage imports');
  it('should add Content imports where needed');
  it('should replace IMessage types with Content');
  it('should maintain TypeScript compilation');
  
  // Property tests
  it('should never break valid TypeScript files');
  it('should preserve all non-IMessage code');
});
```

## Success Criteria
- Migration tests defined
- Tests are behavioral
- Property tests >= 30%