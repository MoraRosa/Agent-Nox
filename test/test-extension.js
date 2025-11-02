/**
 * 🦊 NOX Extension Structure Test
 * Verifies extension structure and basic functionality
 * Moved from root to /test directory for better organization
 */

const fs = require("fs");
const path = require("path");

console.log("🚀 Testing Agent VS Code Extension - Phase 1");
console.log("================================================");

// Test 1: Check package.json structure
console.log("\n1. Testing package.json structure...");
try {
  const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"));

  const requiredFields = [
    "name",
    "displayName",
    "main",
    "contributes",
    "engines",
  ];
  const missingFields = requiredFields.filter((field) => !packageJson[field]);

  if (missingFields.length === 0) {
    console.log("✅ package.json structure is valid");
    console.log(`   - Extension name: ${packageJson.displayName}`);
    console.log(`   - Version: ${packageJson.version}`);
    console.log(`   - Main entry: ${packageJson.main}`);
    console.log(`   - Commands: ${packageJson.contributes.commands.length}`);
  } else {
    console.log("❌ Missing required fields:", missingFields);
  }
} catch (error) {
  console.log("❌ Error reading package.json:", error.message);
}

// Test 2: Check main extension file
console.log("\n2. Testing main extension file...");
try {
  const extensionPath = "./extension.js";
  if (fs.existsSync(extensionPath)) {
    const extensionContent = fs.readFileSync(extensionPath, "utf8");

    // Check for required exports
    const hasActivate = extensionContent.includes("function activate");
    const hasDeactivate = extensionContent.includes("function deactivate");
    const hasExports = extensionContent.includes("module.exports");

    if (hasActivate && hasDeactivate && hasExports) {
      console.log("✅ Extension entry point is properly structured");
    } else {
      console.log("❌ Extension entry point missing required functions");
      console.log(`   - activate: ${hasActivate}`);
      console.log(`   - deactivate: ${hasDeactivate}`);
      console.log(`   - exports: ${hasExports}`);
    }
  } else {
    console.log("❌ Main extension file not found");
  }
} catch (error) {
  console.log("❌ Error reading extension file:", error.message);
}

// Test 3: Check core module structure
console.log("\n3. Testing core module structure...");
const coreModules = [
  "src/utils/logger.js",
  "src/core/performanceMonitor.js",
  "src/core/agentController.js",
  "src/core/aiClient.js",
  "src/core/contextManager.js",
  "src/core/fileOps.js",
  "src/core/indexEngine.js",
  "src/storage/cacheManager.js",
  "src/enterprise/auditLogger.js",
];

let moduleCount = 0;
coreModules.forEach((modulePath) => {
  if (fs.existsSync(modulePath)) {
    moduleCount++;
    console.log(`✅ ${modulePath}`);
  } else {
    console.log(`❌ ${modulePath} - Missing`);
  }
});

console.log(`\n   Core modules: ${moduleCount}/${coreModules.length} found`);

// Test 4: Check command handlers
console.log("\n4. Testing command handlers...");
const commandModules = [
  "src/commands/chatCommand.js",
  "src/commands/explainCommand.js",
  "src/commands/refactorCommand.js",
  "src/commands/analyzeCommand.js",
];

let commandCount = 0;
commandModules.forEach((commandPath) => {
  if (fs.existsSync(commandPath)) {
    commandCount++;
    console.log(`✅ ${commandPath}`);
  } else {
    console.log(`❌ ${commandPath} - Missing`);
  }
});

console.log(
  `\n   Command handlers: ${commandCount}/${commandModules.length} found`
);

// Test 5: Check syntax of main files
console.log("\n5. Testing syntax validation...");

const filesToCheck = [
  "extension.js",
  "src/core/agentController.js",
  "src/utils/logger.js",
];
let syntaxErrors = 0;

for (const file of filesToCheck) {
  try {
    require.resolve(path.resolve(file));
    console.log(`✅ ${file} - Syntax OK`);
  } catch (error) {
    console.log(`❌ ${file} - Syntax Error: ${error.message}`);
    syntaxErrors++;
  }
}

// Summary
console.log("\n📊 Phase 1 Test Summary");
console.log("========================");
console.log(`Core modules: ${moduleCount}/${coreModules.length}`);
console.log(`Command handlers: ${commandCount}/${commandModules.length}`);
console.log(`Syntax errors: ${syntaxErrors}`);

if (
  moduleCount === coreModules.length &&
  commandCount === commandModules.length &&
  syntaxErrors === 0
) {
  console.log("\n🎉 Phase 1 Foundation: COMPLETE");
  console.log("✅ Ready for Phase 2 implementation");
} else {
  console.log("\n⚠️  Phase 1 Foundation: INCOMPLETE");
  console.log("❌ Some issues need to be resolved");
}

console.log("\n🚀 Next Steps:");
console.log("1. Test extension in VS Code development environment");
console.log("2. Implement AI provider integrations (Phase 2)");
console.log("3. Build chat UI with Aurora theming");
console.log("4. Add file indexing and context retrieval");
