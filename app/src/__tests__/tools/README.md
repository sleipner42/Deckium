# Tools Testing Framework

This directory contains comprehensive unit tests for the AI tools in the presentation application.

## Overview

The testing framework provides:
- **MockPresentationService**: A mock service that simulates the presentation service without side effects
- **Test utilities**: Helper functions for creating test scenarios and assertions
- **Comprehensive test suites**: Tests for all major tools with various scenarios

## Structure

```
__tests__/tools/
├── MockPresentationService.ts    # Mock service for testing
├── test-utils.ts                 # Utility functions and helpers
├── README.md                     # This file
├── AddTextElementTool.test.ts    # Tests for text element creation
├── AlignElementsTool.test.ts     # Tests for element alignment
├── DeleteElementTool.test.ts     # Tests for element deletion
├── MatchSizeTool.test.ts         # Tests for size matching
└── [Other tool tests]            # Additional tool test files
```

## Running Tests

```bash
# Run all tool tests
npm test -- __tests__/tools

# Run specific tool test
npm test -- AddTextElementTool.test.ts

# Run tests in watch mode
npm test -- --watch __tests__/tools

# Run tests with coverage
npm test -- --coverage __tests__/tools
```

## Test Categories

### 1. Parameter Validation Tests
- Test required parameter validation
- Test parameter type validation
- Test invalid parameter handling
- Test edge cases and boundary conditions

### 2. Core Functionality Tests
- Test primary tool functionality
- Test different parameter combinations
- Test expected outputs and side effects
- Test tool integration with PresentationService

### 3. Error Handling Tests
- Test error scenarios (missing slides, elements, etc.)
- Test service failure handling
- Test graceful degradation
- Test error message clarity

### 4. Integration Tests
- Test tool interactions with mock service
- Test complex multi-element scenarios
- Test cross-slide operations
- Test performance with many elements

## Writing New Tool Tests

### 1. Basic Test Structure

```typescript
import { YourTool } from '../../main/ai/tools/tools/YourTool';
import { MockPresentationService } from './MockPresentationService';

describe('YourTool', () => {
  let tool: YourTool;
  let mockService: MockPresentationService;

  beforeEach(() => {
    tool = new YourTool();
    mockService = new MockPresentationService();
  });

  describe('Parameter Validation', () => {
    // Test parameter validation...
  });

  describe('Core Functionality', () => {
    // Test main functionality...
  });

  describe('Error Handling', () => {
    // Test error scenarios...
  });
});
```

### 2. Using Test Utilities

```typescript
import { 
  createAlignmentTestScenario, 
  validateToolResult,
  assertElementsAligned 
} from './test-utils';

it('should align elements correctly', async () => {
  const { slideId, elementIds } = createAlignmentTestScenario(mockService);
  
  const result = await tool.execute({
    slideId,
    elementIds: elementIds.join(','),
    alignType: 'left',
  }, mockService as any);

  validateToolResult(result);
  
  const slide = mockService.getSlideById(slideId);
  assertElementsAligned(slide?.elements || [], 'left');
});
```

### 3. Testing Guidelines

1. **Test Parameter Validation First**: Always test required parameters and validation
2. **Use Descriptive Test Names**: Test names should clearly describe what is being tested
3. **Test Edge Cases**: Include boundary conditions and edge cases
4. **Test Error Scenarios**: Ensure graceful error handling
5. **Validate Tool Results**: Use `validateToolResult()` helper to check result structure
6. **Reset State**: Use `beforeEach()` to ensure clean state for each test
7. **Test Performance**: For tools that handle many elements, include performance tests

## Mock Service Features

The `MockPresentationService` provides:

- **State Management**: Maintains presentation state in memory
- **Element Creation**: Helper methods to create mock elements
- **Service Methods**: All PresentationService methods for testing
- **Test Helpers**: Additional methods for test assertions
- **State Reset**: Easy state cleanup between tests

### Key Methods

```typescript
// Create mock elements
const textElement = mockService.createMockTextElement({
  content: 'Test text',
  position: { x: 100, y: 100 },
});

// Create test scenarios
const slide = mockService.addSlide();
mockService.addElement(slide.id, textElement);

// Test helpers
const element = mockService.getElementById(elementId);
const slide = mockService.getSlideById(slideId);
mockService.setSelectedSlideId(slideId);

// Reset between tests
mockService.reset();
```

## Test Utilities

### Scenario Creators
- `createAlignmentTestScenario()`: Creates elements for alignment testing
- `createOverlapTestScenario()`: Creates overlapping elements
- `createGridTestScenario()`: Creates grid layout for complex tests
- `createPerformanceTestScenario()`: Creates many elements for performance testing

### Assertion Helpers
- `assertElementsAligned()`: Verifies elements are properly aligned
- `assertElementsDistributedEvenly()`: Verifies even distribution
- `validateToolResult()`: Validates tool result structure

### Utilities
- `measureExecutionTime()`: Measures performance
- `setupMockEnvironment()`: Sets up environment variables for testing

## Coverage Goals

Aim for high test coverage across:
- ✅ Parameter validation (100%)
- ✅ Core functionality (100%)
- ✅ Error handling (95%+)
- ✅ Edge cases (90%+)
- ✅ Integration scenarios (85%+)

## Best Practices

1. **Isolated Tests**: Each test should be independent and not rely on others
2. **Clear Assertions**: Use specific assertions that clearly validate expected behavior
3. **Comprehensive Coverage**: Test both success and failure scenarios
4. **Performance Awareness**: Include performance tests for tools handling many elements
5. **Readable Tests**: Write tests that serve as documentation for tool behavior
6. **Mock External Dependencies**: Use mocks for external services (Pexels API, etc.)

## Example Test Patterns

### Testing Tool Success
```typescript
it('should successfully create element', async () => {
  const result = await tool.execute(validParams, mockService as any);
  
  expect(result.success).toBe(true);
  expect(result.data).toHaveProperty('elementId');
  
  // Verify side effects
  const slide = mockService.getSlideById(slideId);
  expect(slide?.elements).toHaveLength(1);
});
```

### Testing Tool Failure
```typescript
it('should handle missing parameters', async () => {
  const result = await tool.execute({}, mockService as any);
  
  expect(result.success).toBe(false);
  expect(result.error).toBe('Expected error message');
});
```

### Testing Complex Scenarios
```typescript
it('should handle complex multi-element scenario', async () => {
  const { slideId, elementIds } = createGridTestScenario(mockService, 3, 3);
  
  const result = await tool.execute({
    slideId,
    elementIds: elementIds.join(','),
    // ... other params
  }, mockService as any);
  
  expect(result.success).toBe(true);
  // Verify complex behavior...
});
```

This testing framework ensures robust, reliable tools that handle all scenarios gracefully and provide clear feedback to users.