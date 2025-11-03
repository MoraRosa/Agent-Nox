/**
 * 🦊 NOX Message Protocol Tests
 * 
 * Tests for MessageProtocol class:
 * - Version negotiation
 * - Message validation
 * - Migration handlers
 * - Error handling
 * 
 * Run with: node src/core/messageProtocol.test.js
 */

const { MessageProtocol, CURRENT_PROTOCOL_VERSION } = require("./messageProtocol.js");

// Test logger that captures output
class TestLogger {
  constructor() {
    this.logs = [];
    this.warnings = [];
    this.errors = [];
  }

  info(...args) {
    this.logs.push(args.join(" "));
  }

  warn(...args) {
    this.warnings.push(args.join(" "));
  }

  error(...args) {
    this.errors.push(args.join(" "));
  }

  clear() {
    this.logs = [];
    this.warnings = [];
    this.errors = [];
  }
}

// Test runner
class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log("🦊 Running MessageProtocol Tests...\n");

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✅ ${name}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
      }
    }

    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }
}

// Assertion helpers
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, got ${actual}`
    );
  }
}

function assertDeepEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      message ||
        `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

// Create test runner
const runner = new TestRunner();

// Test 1: Basic initialization
runner.test("MessageProtocol initializes correctly", () => {
  const logger = new TestLogger();
  const protocol = new MessageProtocol(logger);

  assertEqual(protocol.currentVersion, CURRENT_PROTOCOL_VERSION);
  assertEqual(protocol.minSupportedVersion, 1);
  assertEqual(protocol.negotiatedVersion, null);
});

// Test 2: Message wrapping
runner.test("wrapMessage adds version to messages", () => {
  const protocol = new MessageProtocol(new TestLogger());
  const message = { type: "sendMessage", content: "Hello" };
  const wrapped = protocol.wrapMessage(message);

  assertEqual(wrapped.version, CURRENT_PROTOCOL_VERSION);
  assertEqual(wrapped.type, "sendMessage");
  assertEqual(wrapped.content, "Hello");
});

// Test 3: Message validation - valid message
runner.test("validateMessage accepts valid messages", () => {
  const protocol = new MessageProtocol(new TestLogger());
  const message = {
    version: 1,
    type: "sendMessage",
    content: "Hello",
  };

  const result = protocol.validateMessage(message);
  assertEqual(result.valid, true);
  assertEqual(result.errors.length, 0);
});

// Test 4: Message validation - missing required field
runner.test("validateMessage rejects messages with missing required fields", () => {
  const protocol = new MessageProtocol(new TestLogger());
  const message = {
    version: 1,
    type: "sendMessage",
    // Missing 'content' field
  };

  const result = protocol.validateMessage(message);
  assertEqual(result.valid, false);
  assert(result.errors.length > 0);
  assert(result.errors[0].includes("content"));
});

// Test 5: Message validation - wrong type
runner.test("validateMessage rejects messages with wrong field types", () => {
  const protocol = new MessageProtocol(new TestLogger());
  const message = {
    version: 1,
    type: "sendMessage",
    content: 123, // Should be string
  };

  const result = protocol.validateMessage(message);
  assertEqual(result.valid, false);
  assert(result.errors.length > 0);
  assert(result.errors[0].includes("wrong type"));
});

// Test 6: Message validation - unknown type
runner.test("validateMessage handles unknown message types gracefully", () => {
  const logger = new TestLogger();
  const protocol = new MessageProtocol(logger);
  const message = {
    version: 1,
    type: "unknownMessageType",
  };

  const result = protocol.validateMessage(message);
  assertEqual(result.valid, true); // Should not fail
  assertEqual(result.warning, "unknown_type");
  assert(logger.warnings.length > 0);
});

// Test 7: Version support check
runner.test("isVersionSupported checks version compatibility", () => {
  const protocol = new MessageProtocol(new TestLogger());

  assert(protocol.isVersionSupported({ version: 1 }));
  assert(!protocol.isVersionSupported({ version: 0 })); // Below min
  assert(!protocol.isVersionSupported({ version: 999 })); // Above current
});

// Test 8: Message migration - unversioned
runner.test("migrateMessage handles unversioned messages", () => {
  const logger = new TestLogger();
  const protocol = new MessageProtocol(logger);
  const message = { type: "sendMessage", content: "Hello" };

  const migrated = protocol.migrateMessage(message);

  assertEqual(migrated.version, CURRENT_PROTOCOL_VERSION);
  assertEqual(migrated.type, "sendMessage");
  assertEqual(migrated.content, "Hello");
  assert(logger.warnings.length > 0); // Should log deprecation warning
});

// Test 9: Message migration - already current version
runner.test("migrateMessage skips migration for current version", () => {
  const logger = new TestLogger();
  const protocol = new MessageProtocol(logger);
  const message = {
    version: CURRENT_PROTOCOL_VERSION,
    type: "sendMessage",
    content: "Hello",
  };

  const migrated = protocol.migrateMessage(message);

  assertDeepEqual(migrated, message);
  assertEqual(logger.warnings.length, 0); // No warnings
});

// Test 10: Process incoming message - valid
runner.test("processIncomingMessage handles valid messages", () => {
  const protocol = new MessageProtocol(new TestLogger());
  const message = {
    version: 1,
    type: "sendMessage",
    content: "Hello",
  };

  const result = protocol.processIncomingMessage(message);

  assertEqual(result.valid, true);
  assertEqual(result.errors.length, 0);
  assertEqual(result.message.version, 1);
});

// Test 11: Process incoming message - invalid
runner.test("processIncomingMessage rejects invalid messages", () => {
  const protocol = new MessageProtocol(new TestLogger());
  const message = {
    version: 1,
    type: "sendMessage",
    // Missing content
  };

  const result = protocol.processIncomingMessage(message);

  assertEqual(result.valid, false);
  assert(result.errors.length > 0);
  assertEqual(result.message, null);
});

// Test 12: Handshake request
runner.test("createHandshakeRequest creates valid handshake", () => {
  const protocol = new MessageProtocol(new TestLogger());
  const handshake = protocol.createHandshakeRequest();

  assertEqual(handshake.type, "protocolHandshake");
  assertEqual(handshake.version, CURRENT_PROTOCOL_VERSION);
  assertEqual(handshake.minVersion, 1);
  assertEqual(handshake.clientType, "webview");
  assert(handshake.timestamp > 0);
});

// Test 13: Handshake response - compatible
runner.test("createHandshakeResponse negotiates compatible version", () => {
  const protocol = new MessageProtocol(new TestLogger());
  const request = {
    type: "protocolHandshake",
    version: 1,
    minVersion: 1,
    clientType: "webview",
  };

  const response = protocol.createHandshakeResponse(request);

  assertEqual(response.type, "protocolHandshakeResponse");
  assertEqual(response.compatible, true);
  assertEqual(response.negotiatedVersion, 1);
  assertEqual(protocol.negotiatedVersion, 1);
});

// Test 14: Handshake response - incompatible
runner.test("createHandshakeResponse detects incompatible versions", () => {
  const protocol = new MessageProtocol(new TestLogger());
  const request = {
    type: "protocolHandshake",
    version: 999, // Future version
    minVersion: 999,
    clientType: "webview",
  };

  const response = protocol.createHandshakeResponse(request);

  assertEqual(response.compatible, false);
  assertEqual(response.negotiatedVersion, null);
});

// Test 15: Process handshake response
runner.test("processHandshakeResponse handles successful handshake", () => {
  const logger = new TestLogger();
  const protocol = new MessageProtocol(logger);
  const response = {
    type: "protocolHandshakeResponse",
    version: 1,
    minVersion: 1,
    negotiatedVersion: 1,
    compatible: true,
    serverType: "extension",
  };

  const result = protocol.processHandshakeResponse(response);

  assertEqual(result.compatible, true);
  assertEqual(result.version, 1);
  assertEqual(protocol.negotiatedVersion, 1);
  assert(logger.logs.some((log) => log.includes("handshake successful")));
});

// Test 16: Custom migration handler
runner.test("registerMigrationHandler adds custom migration", () => {
  const logger = new TestLogger();
  const protocol = new MessageProtocol(logger);

  protocol.registerMigrationHandler(1, (message) => ({
    ...message,
    version: 2,
    migrated: true,
  }));

  assert(logger.logs.some((log) => log.includes("Registered migration")));
});

// Test 17: Get stats
runner.test("getStats returns protocol statistics", () => {
  const protocol = new MessageProtocol(new TestLogger());
  const stats = protocol.getStats();

  assertEqual(stats.currentVersion, CURRENT_PROTOCOL_VERSION);
  assertEqual(stats.minSupportedVersion, 1);
  assertEqual(stats.handshakeComplete, false);
  assert(stats.registeredMigrations >= 1); // At least v0→v1
});

// Run all tests
runner.run().then((success) => {
  process.exit(success ? 0 : 1);
});

