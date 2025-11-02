/**
 * Test script to verify nox-sox integration with voice recording service
 */

console.log('🎤 Testing Nox Voice Recording Integration...');

try {
  // Test 1: Check if nox-sox package is available
  console.log('\n📦 Testing nox-sox package...');
  const { soxPath, getSoxVersion, isSoxAvailable } = require('nox-sox');
  
  console.log(`✅ nox-sox loaded successfully`);
  console.log(`📍 SoX Path: ${soxPath}`);
  console.log(`📦 SoX Version: ${getSoxVersion()}`);
  console.log(`🔍 SoX Available: ${isSoxAvailable()}`);

  // Test 2: Check if voice recording service can detect bundled SoX
  console.log('\n🎤 Testing Voice Recording Service...');
  
  // Mock the logger for testing
  const mockLogger = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    warn: (msg) => console.log(`[WARN] ${msg}`),
    error: (msg) => console.log(`[ERROR] ${msg}`)
  };

  // Import and test the voice recording service
  const VoiceRecordingService = require('./src/core/voiceRecordingService.js');
  const voiceService = new VoiceRecordingService(mockLogger);

  // Test the detection capability
  voiceService.detectRecordingCapability().then(capability => {
    console.log('\n🔍 Recording Capability Detection Result:');
    console.log(`✅ Available: ${capability.available}`);
    console.log(`🔧 Method: ${capability.method}`);
    console.log(`📍 SoX Path: ${capability.soxPath}`);
    
    if (capability.available) {
      console.log('\n🎉 SUCCESS! Voice recording is ready to use with bundled SoX!');
      console.log('🎯 User Experience: Mic button will work without manual SoX installation');
    } else {
      console.log('\n⚠️  Voice recording not available:', capability.error);
    }
  }).catch(error => {
    console.error('\n❌ Error testing voice recording service:', error.message);
  });

} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.log('\nℹ️  Make sure to run: npm install ./packages/nox-sox');
}
