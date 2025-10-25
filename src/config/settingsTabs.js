/**
 * 🦊 Nox Settings Tabs Configuration
 * Data-driven tab definitions for infinitely scalable settings panel
 *
 * This file defines all settings tabs. To add a new tab:
 * 1. Add entry to this array
 * 2. Create corresponding section HTML in extension.js getSettingsPanelContent()
 * 3. Add message handler in extension.js openSettingsPanel()
 *
 * No other changes needed - UI renders automatically!
 */

module.exports = [
  {
    id: "account",
    label: "👤 Account",
    icon: "👤",
    description: "Manage your account and reset extension",
  },
  {
    id: "api-keys",
    label: "🔑 API Keys",
    icon: "🔑",
    description: "Configure your AI provider API keys securely",
  },
  {
    id: "voice",
    label: "🎤 Voice Input",
    icon: "🎤",
    description: "Configure voice-to-text settings for hands-free coding",
  },
  {
    id: "theme",
    label: "🎨 Theme",
    icon: "🎨",
    description: "Choose your preferred Aurora theme",
  },
  {
    id: "performance",
    label: "📊 Performance",
    icon: "📊",
    description: "View performance metrics and analytics",
  },
  {
    id: "preferences",
    label: "⚙️ Preferences",
    icon: "⚙️",
    description: "Customize Nox behavior and debugging options",
  },
  {
    id: "help",
    label: "📖 Help & Documentation",
    icon: "📖",
    description: "Get help and access documentation",
  },
  {
    id: "about",
    label: "ℹ️ About",
    icon: "ℹ️",
    description: "About Nox and version information",
  },
];
