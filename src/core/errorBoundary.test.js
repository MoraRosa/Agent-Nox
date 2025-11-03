/**
 * 🛡️ Error Boundary Test Suite
 * 
 * Comprehensive tests for error boundary functionality
 * Run with: node src/core/errorBoundary.test.js
 */

const { ErrorBoundary, ErrorSeverity, ErrorCategory } = require('./errorBoundary');

// Test counter
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

// Mock logger
const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  log: () => {}
};

/**
 * Test helper
 */
function test(name, fn) {
  testsRun++;
  try {
    fn();
    testsPassed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    testsFailed++;
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
  }
}

/**
 * Assert helper
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

console.log('🦊 Running Error Boundary Tests...\n');

// ============================================================================
// Test 1: ErrorBoundary Initialization
// ============================================================================
test('ErrorBoundary initializes correctly', () => {
  const eb = new ErrorBoundary(mockLogger);
  assert(eb !== null, 'ErrorBoundary should be created');
  assert(eb.options.maxRetries === 3, 'Default maxRetries should be 3');
  assert(eb.options.retryDelay === 1000, 'Default retryDelay should be 1000');
});

// ============================================================================
// Test 2: wrapAsync - Success Case
// ============================================================================
test('wrapAsync handles successful async function', async () => {
  const eb = new ErrorBoundary(mockLogger);
  const result = await eb.wrapAsync(
    async () => 'success',
    'Test operation',
    'fallback'
  );
  assert(result === 'success', 'Should return success value');
});

// ============================================================================
// Test 3: wrapAsync - Error Case with Fallback
// ============================================================================
test('wrapAsync returns fallback on error', async () => {
  const eb = new ErrorBoundary(mockLogger);
  const result = await eb.wrapAsync(
    async () => { throw new Error('Test error'); },
    'Test operation',
    'fallback'
  );
  assert(result === 'fallback', 'Should return fallback value');
});

// ============================================================================
// Test 4: wrapMessageHandler - Valid Message
// ============================================================================
test('wrapMessageHandler handles valid message', async () => {
  const eb = new ErrorBoundary(mockLogger);
  let handlerCalled = false;
  
  const handler = eb.wrapMessageHandler(
    async (message) => {
      handlerCalled = true;
      assert(message.type === 'test', 'Message type should be test');
    }
  );
  
  await handler({ type: 'test', data: 'value' });
  assert(handlerCalled, 'Handler should be called');
});

// ============================================================================
// Test 5: wrapMessageHandler - Invalid Message
// ============================================================================
test('wrapMessageHandler handles invalid message', async () => {
  const eb = new ErrorBoundary(mockLogger);
  let errorCallbackCalled = false;
  
  const handler = eb.wrapMessageHandler(
    async (message) => {
      // Should not be called
    },
    (error, message) => {
      errorCallbackCalled = true;
    }
  );
  
  await handler(null); // Invalid message
  assert(errorCallbackCalled, 'Error callback should be called');
});

// ============================================================================
// Test 6: wrapMessageHandler - Missing Type Field
// ============================================================================
test('wrapMessageHandler handles message without type', async () => {
  const eb = new ErrorBoundary(mockLogger);
  let errorCallbackCalled = false;
  
  const handler = eb.wrapMessageHandler(
    async (message) => {
      // Should not be called
    },
    (error, message) => {
      errorCallbackCalled = true;
    }
  );
  
  await handler({ data: 'value' }); // Missing type
  assert(errorCallbackCalled, 'Error callback should be called');
});

// ============================================================================
// Test 7: safeDOM - Success Case
// ============================================================================
test('safeDOM handles successful DOM operation', () => {
  const eb = new ErrorBoundary(mockLogger);
  const result = eb.safeDOM(
    () => 'dom-result',
    'fallback',
    'Test DOM operation'
  );
  assert(result === 'dom-result', 'Should return DOM result');
});

// ============================================================================
// Test 8: safeDOM - Error Case
// ============================================================================
test('safeDOM returns fallback on error', () => {
  const eb = new ErrorBoundary(mockLogger);
  const result = eb.safeDOM(
    () => { throw new Error('DOM error'); },
    'fallback',
    'Test DOM operation'
  );
  assert(result === 'fallback', 'Should return fallback value');
});

// ============================================================================
// Test 9: wrapStreaming - Success Case
// ============================================================================
test('wrapStreaming handles successful stream', async () => {
  const eb = new ErrorBoundary(mockLogger);
  let cleanupCalled = false;
  
  const result = await eb.wrapStreaming(
    async () => 'stream-result',
    async () => { cleanupCalled = true; },
    'Test stream'
  );
  
  assert(result === 'stream-result', 'Should return stream result');
  assert(!cleanupCalled, 'Cleanup should not be called on success');
});

// ============================================================================
// Test 10: wrapStreaming - Error Case with Cleanup
// ============================================================================
test('wrapStreaming calls cleanup on error', async () => {
  const eb = new ErrorBoundary(mockLogger);
  let cleanupCalled = false;
  
  try {
    await eb.wrapStreaming(
      async () => { throw new Error('Stream error'); },
      async () => { cleanupCalled = true; },
      'Test stream'
    );
    assert(false, 'Should have thrown error');
  } catch (error) {
    assert(cleanupCalled, 'Cleanup should be called on error');
    assert(error.message === 'Stream error', 'Should throw original error');
  }
});

// ============================================================================
// Test 11: validateMessage - Valid Message
// ============================================================================
test('validateMessage accepts valid message', () => {
  const eb = new ErrorBoundary(mockLogger);
  const result = eb.validateMessage(
    { type: 'test', data: 'value' },
    {
      required: ['type', 'data'],
      types: { type: 'string', data: 'string' }
    }
  );
  
  assert(result.valid === true, 'Message should be valid');
  assert(result.errors.length === 0, 'Should have no errors');
});

// ============================================================================
// Test 12: validateMessage - Missing Required Field
// ============================================================================
test('validateMessage rejects message with missing field', () => {
  const eb = new ErrorBoundary(mockLogger);
  const result = eb.validateMessage(
    { type: 'test' },
    {
      required: ['type', 'data'],
      types: { type: 'string' }
    }
  );
  
  assert(result.valid === false, 'Message should be invalid');
  assert(result.errors.length > 0, 'Should have errors');
  assert(result.errors[0].includes('data'), 'Error should mention missing field');
});

// ============================================================================
// Test 13: validateMessage - Wrong Type
// ============================================================================
test('validateMessage rejects message with wrong type', () => {
  const eb = new ErrorBoundary(mockLogger);
  const result = eb.validateMessage(
    { type: 'test', data: 123 },
    {
      required: ['type', 'data'],
      types: { type: 'string', data: 'string' }
    }
  );
  
  assert(result.valid === false, 'Message should be invalid');
  assert(result.errors.length > 0, 'Should have errors');
  assert(result.errors[0].includes('wrong type'), 'Error should mention wrong type');
});

// ============================================================================
// Test 14: isRetryableError - Network Error
// ============================================================================
test('isRetryableError detects network errors', () => {
  const eb = new ErrorBoundary(mockLogger);
  const error = new Error('network timeout');
  assert(eb.isRetryableError(error), 'Should detect network error as retryable');
});

// ============================================================================
// Test 15: isRetryableError - 503 Error
// ============================================================================
test('isRetryableError detects 503 errors', () => {
  const eb = new ErrorBoundary(mockLogger);
  const error = new Error('503 Service Unavailable');
  assert(eb.isRetryableError(error), 'Should detect 503 as retryable');
});

// ============================================================================
// Test 16: isRetryableError - Non-Retryable Error
// ============================================================================
test('isRetryableError rejects non-retryable errors', () => {
  const eb = new ErrorBoundary(mockLogger);
  const error = new Error('401 Unauthorized');
  assert(!eb.isRetryableError(error), 'Should not detect 401 as retryable');
});

// ============================================================================
// Test 17: Error Statistics Tracking
// ============================================================================
test('Error statistics are tracked correctly', () => {
  const eb = new ErrorBoundary(mockLogger);
  
  // Generate some errors
  eb.safeDOM(() => { throw new Error('DOM error 1'); }, null, 'Test 1');
  eb.safeDOM(() => { throw new Error('DOM error 2'); }, null, 'Test 2');
  eb.safeDOM(() => { throw new Error('Network error'); }, null, 'Test 3');
  
  const stats = eb.getStats();
  assert(stats.totalErrors === 3, 'Should track 3 errors');
  assert(stats.recentErrors.length === 3, 'Should have 3 recent errors');
});

// ============================================================================
// Test 18: Error History Clearing
// ============================================================================
test('Error history can be cleared', () => {
  const eb = new ErrorBoundary(mockLogger);
  
  // Generate some errors
  eb.safeDOM(() => { throw new Error('Test error'); }, null, 'Test');
  
  let stats = eb.getStats();
  assert(stats.totalErrors === 1, 'Should have 1 error');
  
  eb.clearHistory();
  
  stats = eb.getStats();
  assert(stats.totalErrors === 0, 'Should have 0 errors after clear');
});

// ============================================================================
// Test 19: wrapAsyncWithRetry - Success on First Try
// ============================================================================
test('wrapAsyncWithRetry succeeds on first try', async () => {
  const eb = new ErrorBoundary(mockLogger);
  let attempts = 0;
  
  const result = await eb.wrapAsyncWithRetry(
    async () => {
      attempts++;
      return 'success';
    },
    'Test retry',
    { maxRetries: 3 }
  );
  
  assert(result === 'success', 'Should return success');
  assert(attempts === 1, 'Should only attempt once');
});

// ============================================================================
// Test 20: wrapAsyncWithRetry - Success on Retry
// ============================================================================
test('wrapAsyncWithRetry succeeds on retry', async () => {
  const eb = new ErrorBoundary(mockLogger);
  let attempts = 0;
  
  const result = await eb.wrapAsyncWithRetry(
    async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('network timeout'); // Retryable
      }
      return 'success';
    },
    'Test retry',
    { maxRetries: 3, retryDelay: 10 }
  );
  
  assert(result === 'success', 'Should return success');
  assert(attempts === 2, 'Should attempt twice');
});

// ============================================================================
// Print Results
// ============================================================================
console.log('\n' + '='.repeat(50));
console.log(`📊 Test Results:`);
console.log(`   Total: ${testsRun}`);
console.log(`   ✅ Passed: ${testsPassed}`);
console.log(`   ❌ Failed: ${testsFailed}`);
console.log('='.repeat(50));

if (testsFailed === 0) {
  console.log('\n🎉 All tests passed!\n');
  process.exit(0);
} else {
  console.log(`\n❌ ${testsFailed} test(s) failed\n`);
  process.exit(1);
}

