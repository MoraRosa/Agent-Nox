/**
 * 🦊 Nox Webview Entry Point
 * Enterprise-grade webview bundle entry point
 */

// Import enterprise styles (will be processed by webpack)
import './styles.css';
import './markdown-styles.css';

// Import markdown test module
import { MarkdownTester } from './markdown-test';
import { NoxMarkdownRenderer, initializeCopyButtons } from './markdown-renderer';

// Import types and components
import {
  VSCodeAPI,
  ChatMessage,
  WebviewState,
  BaseMessage,
  SendMessageRequest,
  SendStreamingMessageRequest,
  ProviderChangeRequest,
  ModelChangeRequest,
  ClearHistoryRequest,
  ReadyMessage,
  GetProviderStatusRequest
} from './types';

import {
  MessageComponent,
  ProviderSelectorComponent,
  ModelSelectorComponent,
  ThinkingIndicatorComponent,
  StreamingMessageComponent
} from './components';

// VS Code API
declare const acquireVsCodeApi: () => VSCodeAPI;

/**
 * Main Nox Chat Application
 * Enterprise-grade chat interface with modular architecture
 */
class NoxChatApp {
  private vscode: VSCodeAPI;
  private state: WebviewState;
  private debugMode: boolean = false;
  private elements: {
    messagesContainer?: HTMLElement;
    messageInput?: HTMLTextAreaElement;
    sendBtn?: HTMLButtonElement;
    micBtn?: HTMLButtonElement;
    voiceError?: HTMLElement;
    thinkingIndicator?: HTMLElement;
    providerControls?: HTMLElement;
    sessionCost?: HTMLElement;
    sessionTokens?: HTMLElement;
    streamingToggle?: HTMLInputElement;
  } = {};

  // Speech Recognition properties
  private speechRecognition: any = null;
  private isRecording: boolean = false;
  private speechSupported: boolean = false;
  private permissionState: 'unknown' | 'granted' | 'denied' = 'unknown';

  constructor() {
    this.vscode = acquireVsCodeApi();
    // Store vscode API globally so components can access it
    (window as any).vscodeApi = this.vscode;
    this.state = this.initializeState();
    this.initialize();
  }

  private initializeState(): WebviewState {
    return {
      chatHistory: [],
      sessionStats: {
        totalTokens: 0,
        totalCost: 0,
        messageCount: 0,
        startTime: new Date().toISOString()
      },
      currentProvider: 'anthropic',
      currentModel: 'claude-sonnet-4-5-20250929',
      isAIResponding: false
    };
  }

  private initialize(): void {
    // Test markdown libraries (only in debug mode)
    if (this.debugMode) {
      this.testMarkdownLibraries();
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupUI();
      });
    } else {
      this.setupUI();
    }
  }

  private testMarkdownLibraries(): void {
    const testsPassed = MarkdownTester.runAllTests();
    if (!testsPassed) {
      console.error('❌ Markdown library tests failed');
    }
  }

  private setupUI(): void {
    // Get DOM elements
    this.elements.messagesContainer = document.getElementById('messagesContainer') as HTMLElement;
    this.elements.messageInput = document.getElementById('messageInput') as HTMLTextAreaElement;
    this.elements.sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;
    this.elements.micBtn = document.getElementById('micBtn') as HTMLButtonElement;
    this.elements.voiceError = document.getElementById('voiceError') as HTMLElement;
    this.elements.sessionCost = document.getElementById('sessionCost') as HTMLElement;
    this.elements.sessionTokens = document.getElementById('sessionTokens') as HTMLElement;
    this.elements.streamingToggle = document.getElementById('streamingToggle') as HTMLInputElement;

    // Initialize speech recognition
    this.initializeSpeechRecognition();

    // Initialize copy button functionality
    initializeCopyButtons();

    // Setup event listeners
    this.setupEventListeners();

    // Setup message handling
    this.setupMessageHandling();

    // Request initial data from extension
    this.sendMessage({ type: 'ready' });
    this.sendMessage({ type: 'getVoiceStatus' });


  }

  private setupEventListeners(): void {
    // Send button click
    this.elements.sendBtn?.addEventListener('click', () => {
      this.sendUserMessage();
    });

    // Microphone button click
    this.elements.micBtn?.addEventListener('click', () => {
      this.toggleVoiceRecording();
    });

    // Enter key to send (Shift+Enter for new line)
    this.elements.messageInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendUserMessage();
      }
    });

    // Auto-resize textarea
    this.elements.messageInput?.addEventListener('input', () => {
      this.autoResizeTextarea();
    });

    // Provider change handler
    const providerSelect = document.getElementById('providerSelect') as HTMLSelectElement;
    providerSelect?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.sendMessage({
        type: 'changeProvider',
        provider: target.value
      } as ProviderChangeRequest);
    });

    // Model change handler
    const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement;
    modelSelect?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.sendMessage({
        type: 'changeModel',
        model: target.value
      } as ModelChangeRequest);
    });

    // Header controls
    this.setupHeaderControls();
  }

  private setupHeaderControls(): void {
    // Header controls are now handled by VS Code native header
    // Toggle functionality is handled via extension message in handleExtensionMessage()
  }

  private toggleProviderSection(): void {
    console.log('🦊 Toggle provider section called');
    const providerControls = document.getElementById('providerControls') as HTMLElement;

    if (!providerControls) {
      console.log('🦊 Provider controls element not found');
      return;
    }

    const isCollapsed = providerControls.classList.contains('collapsed');
    console.log('🦊 Current collapsed state:', isCollapsed);

    if (isCollapsed) {
      providerControls.classList.remove('collapsed');
      console.log('🦊 Expanded provider section');
    } else {
      providerControls.classList.add('collapsed');
      console.log('🦊 Collapsed provider section');
    }

    // Send the new state back to extension for button icon update
    this.sendMessage({
      type: 'providerSectionToggled',
      collapsed: !isCollapsed
    } as any);
  }

  private clearChat(): void {
    // Clear the messages container
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="welcome-message">
          <div class="fox-welcome">🦊</div>
          <div class="welcome-text">
            <h3>Welcome to Nox!</h3>
            <p>Your clever AI coding fox is ready to help.</p>
            <div class="bundled-indicator">✨ Enterprise Bundle</div>
          </div>
        </div>
      `;
    }

    // Reset session stats
    this.resetSessionStats();

    // Notify extension to clear chat history
    this.sendMessage({ type: 'clearChat' });
  }

  private setupMessageHandling(): void {
    window.addEventListener('message', (event) => {
      if (this.debugMode) {
        console.log('🦊 [WEBVIEW] Received:', event.data?.type);
      }
      this.handleExtensionMessage(event.data);
    });
  }

  private sendMessage(message: BaseMessage): void {
    if (this.debugMode) {
      console.log('🦊 [WEBVIEW] Sending:', message.type);
    }
    this.vscode.postMessage(message);
  }

  /**
   * 🎨 Handle CSS injection for Aurora theme animations
   */
  private handleCSSInjection(message: any): void {
    try {
      // Execute the CSS injection script with !important flags
      eval(message.script);

      if (this.debugMode) {
        console.log('🎨 Theme applied:', message.theme?.name);
      }
    } catch (error) {
      console.error('🎨 Theme CSS injection failed:', error);
    }
  }

  /**
   * 🎨 Handle theme change notifications
   */
  private handleThemeChanged(message: any): void {
    try {
      if (message.theme?.cssVariables) {
        // Apply CSS variables from theme change
        const root = document.documentElement;
        const variables = message.theme.cssVariables;

        // CRITICAL FIX: Apply CSS variables with 'important' flag to override bundled CSS defaults
        Object.entries(variables).forEach(([property, value]) => {
          root.style.setProperty(property, value as string, 'important');
        });

        // Trigger Aurora animation refresh
        const auroraElements = document.querySelectorAll('.aurora-bg, .progress-fill');
        auroraElements.forEach(el => {
          const element = el as HTMLElement;
          element.style.animation = 'none';
          element.offsetHeight; // Trigger reflow
          element.style.animation = '';
        });

        if (this.debugMode) {
          console.log('🎨 Theme changed:', message.theme.name);
        }
      }
    } catch (error) {
      console.error('🎨 Theme change failed:', error);
    }
  }

  private sendUserMessage(): void {
    const message = this.elements.messageInput?.value.trim();

    if (!message || this.state.isAIResponding) {
      return;
    }

    // Check if streaming is enabled
    const isStreamingEnabled = this.elements.streamingToggle?.checked ?? true;

    console.log(`🌊 Sending message with streaming: ${isStreamingEnabled}`);

    // Send to extension (streaming or regular based on toggle)
    const request = isStreamingEnabled
      ? { type: 'sendStreamingMessage', content: message } as SendStreamingMessageRequest
      : { type: 'sendMessage', content: message } as SendMessageRequest;

    this.sendMessage(request);

    // Clear input
    if (this.elements.messageInput) {
      this.elements.messageInput.value = '';
      this.autoResizeTextarea();
    }
  }

  private autoResizeTextarea(): void {
    if (this.elements.messageInput) {
      this.elements.messageInput.style.height = 'auto';
      this.elements.messageInput.style.height =
        Math.min(this.elements.messageInput.scrollHeight, 100) + 'px';
    }
  }

  private handleExtensionMessage(message: any): void {
    switch (message.type) {
      case 'userMessage':
        this.addMessage(message.message);
        break;

      case 'aiMessage':
        this.addMessage(message.message);
        this.updateSessionStats(message.message.tokens, message.message.cost);
        this.state.isAIResponding = false;
        break;

      case 'aiThinking':
        this.showThinking(message.thinking);
        this.state.isAIResponding = message.thinking;
        break;

      case 'error':
        this.showError(message.message);
        this.state.isAIResponding = false;
        break;

      case 'clearMessages':
        this.clearMessages();
        this.resetSessionStats();
        break;

      case 'loadHistory':
        this.loadHistory(message.history);
        break;

      case 'providerStatus':
        this.updateProviderStatus(message);
        break;

      case 'messageDeleted':
        this.removeMessage(message.messageId);
        break;

      case 'messageRegenerated':
        this.replaceMessage(message.oldMessageId, message.newMessage);
        break;

      case 'toggleProviderSection':
        this.toggleProviderSection();
        break;

      case 'insertVoiceText':
        this.insertVoiceText(message.text);
        break;

      case 'showInlineRecording':
        this.showInlineRecording(message.recording);
        break;

      case 'hideInlineRecording':
        this.hideInlineRecording();
        break;

      case 'voiceStatus':
        this.handleVoiceStatus(message.status);
        break;

      case 'confirmDelete':
        this.handleConfirmDelete(message.messageId);
        break;

      // Streaming message handlers
      case 'streamStart':
        this.startStreamingMessage(message.messageId);
        break;

      case 'streamChunk':
        this.updateStreamingMessage(message.messageId, message.chunk, message.tokens);
        break;

      case 'streamComplete':
        this.completeStreamingMessage(message.messageId, message.finalMessage);
        break;

      case 'streamError':
        this.handleStreamingError(message.messageId, message.error);
        break;

      case 'streamStopped':
        this.handleStreamStopped(message.messageId, message.partialContent);
        break;

      case 'injectCSS':
        // Handle CSS injection for Aurora theme animations
        this.handleCSSInjection(message);
        break;

      case 'themeChanged':
        // Handle theme change notifications
        this.handleThemeChanged(message);
        break;

      case 'gitOperationResult':
        this.handleGitOperationResult(message);
        break;

      case 'gitOperationError':
        this.handleGitOperationError(message);
        break;

      case 'preferencesData':
        // Update debug mode from preferences
        this.debugMode = message.debugMode;
        console.log('🐛 Debug mode updated:', this.debugMode);
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  /**
   * 🎤 Trigger native voice input command
   */
  private triggerNativeVoiceInput(): void {
    // Send message to extension to trigger native voice input command
    this.sendMessage({
      type: 'triggerNativeVoice'
    });
    console.log('🎤 Triggered native voice input command');
  }

  /**
   * 🎤 Insert voice text into input field
   */
  private insertVoiceText(text: string): void {
    if (this.elements.messageInput && text) {
      // Insert the voice text into the input field
      const currentValue = this.elements.messageInput.value;
      const newValue = currentValue ? `${currentValue} ${text}` : text;
      this.elements.messageInput.value = newValue;

      // Auto-resize the textarea
      this.autoResizeTextarea();

      // Focus the input field
      this.elements.messageInput.focus();

      // Position cursor at the end
      this.elements.messageInput.setSelectionRange(newValue.length, newValue.length);

      console.log('🎤 Voice text inserted:', text);
    }
  }

  /**
   * 🎤 Show inline voice recording animation
   */
  private showInlineRecording(recording: boolean): void {
    // Show animation inside input field
    const animation = document.getElementById('voiceRecordingAnimation');
    if (animation) {
      animation.style.display = 'flex';
    }

    // Add recording class to input for padding adjustment
    const messageInput = document.getElementById('messageInput') as HTMLTextAreaElement;
    if (messageInput) {
      messageInput.classList.add('recording');
      messageInput.placeholder = 'Listening...';
    }

    this.isRecording = recording;
    this.updateMicButtonState();

    console.log('🎤 Inline recording animation shown');
  }

  /**
   * 🎤 Hide inline voice recording animation
   */
  private hideInlineRecording(): void {
    // Hide animation
    const animation = document.getElementById('voiceRecordingAnimation');
    if (animation) {
      animation.style.display = 'none';
    }

    // Remove recording class from input
    const messageInput = document.getElementById('messageInput') as HTMLTextAreaElement;
    if (messageInput) {
      messageInput.classList.remove('recording');
      messageInput.placeholder = 'Ask Nox anything about your code...';
    }

    this.isRecording = false;
    this.updateMicButtonState();

    console.log('🎤 Inline recording animation hidden');
  }

  /**
   * 🎤 Stop voice recording from modal button
   */
  public stopVoiceRecording(): void {
    if (this.isRecording) {
      // Send stop message to extension
      this.sendMessage({
        type: 'stopVoiceRecording'
      });
      console.log('🎤 Stop voice recording requested from modal');
    }
  }

  /**
   * Remove a message from the chat
   */
  private removeMessage(messageId: string): void {
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageEl) {
      messageEl.remove();
      // Remove from state
      this.state.chatHistory = this.state.chatHistory.filter(msg => msg.id !== messageId);
    }
  }

  /**
   * Replace a message with a new one (for regeneration)
   */
  private replaceMessage(oldMessageId: string, newMessage: ChatMessage): void {
    const oldMessageEl = document.querySelector(`[data-message-id="${oldMessageId}"]`);
    if (oldMessageEl) {
      const newMessageEl = MessageComponent.create({ message: newMessage });
      oldMessageEl.parentNode?.replaceChild(newMessageEl, oldMessageEl);

      // Update state
      const index = this.state.chatHistory.findIndex(msg => msg.id === oldMessageId);
      if (index !== -1) {
        this.state.chatHistory[index] = newMessage;
      }
    }
  }

  /**
   * Reset session statistics
   */
  private resetSessionStats(): void {
    this.state.sessionStats = {
      totalTokens: 0,
      totalCost: 0,
      messageCount: 0,
      startTime: new Date().toISOString()
    };

    if (this.elements.sessionTokens) {
      this.elements.sessionTokens.textContent = '0';
    }

    if (this.elements.sessionCost) {
      this.elements.sessionCost.textContent = '$0.00';
    }

    // Remove session summary
    const summaryEl = document.getElementById('sessionSummary');
    if (summaryEl) {
      summaryEl.remove();
    }
  }

  private addMessage(message: ChatMessage): void {
    if (!this.elements.messagesContainer) return;

    const messageEl = MessageComponent.create({ message });
    this.elements.messagesContainer.appendChild(messageEl);
    this.scrollToBottom();

    // Update state
    this.state.chatHistory.push(message);
  }

  private showThinking(show: boolean): void {
    if (!this.elements.thinkingIndicator) {
      this.elements.thinkingIndicator = ThinkingIndicatorComponent.create();
      this.elements.messagesContainer?.appendChild(this.elements.thinkingIndicator);
    }

    this.elements.thinkingIndicator.style.display = show ? 'flex' : 'none';
    if (show) {
      this.scrollToBottom();
    }
  }

  private showError(error: string): void {
    if (!this.elements.messagesContainer) return;

    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.textContent = error;

    this.elements.messagesContainer.appendChild(errorEl);
    this.scrollToBottom();

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorEl.parentNode) {
        errorEl.parentNode.removeChild(errorEl);
      }
    }, 5000);
  }

  private clearMessages(): void {
    if (!this.elements.messagesContainer) return;

    // Keep welcome message, remove others
    const welcomeMsg = this.elements.messagesContainer.querySelector('.welcome-message');
    this.elements.messagesContainer.innerHTML = '';
    if (welcomeMsg) {
      this.elements.messagesContainer.appendChild(welcomeMsg);
    }

    this.state.chatHistory = [];
  }

  private loadHistory(history: ChatMessage[]): void {
    this.clearMessages();
    history.forEach(msg => this.addMessage(msg));
    this.state.chatHistory = [...history];
  }

  private updateProviderStatus(data: any): void {
    if (this.debugMode) {
      console.log('🦊 [WEBVIEW] updateProviderStatus:', data);
    }

    // Validate data structure
    if (!data) {
      console.warn('🦊 No data received for provider status');
      return;
    }

    if (!data.currentProvider) {
      console.warn('🦊 Missing currentProvider in data:', data);
      console.warn('🦊 Available properties:', Object.keys(data));
      return;
    }

    if (!data.providers) {
      console.warn('🦊 Missing providers in data:', data);
      return;
    }

    // First, populate the provider dropdown with all available providers
    this.populateProviderDropdown(data.providers, data.currentProvider);

    // Get current provider data
    const currentProviderData = data.providers[data.currentProvider];
    if (!currentProviderData) {
      console.warn('🦊 No data found for current provider:', data.currentProvider);
      return;
    }

    // Update model dropdown with current provider's models
    this.updateModelDropdown(currentProviderData, data.currentModel);

    // Update status indicator
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');

    if (statusIndicator && statusText) {
      if (currentProviderData.hasApiKey) {
        statusIndicator.className = 'status-indicator';
        statusText.textContent = 'Ready';
      } else {
        statusIndicator.className = 'status-indicator error';
        statusText.textContent = 'No API Key';
      }
    }
  }

  private populateProviderDropdown(providers: any, currentProvider: string): void {
    const providerSelect = document.getElementById('providerSelect') as HTMLSelectElement;
    if (!providerSelect) {
      console.warn('🦊 Provider select element not found');
      return;
    }

    // Clear existing options
    providerSelect.innerHTML = '';

    // Add options for each provider
    Object.entries(providers).forEach(([providerId, providerData]: [string, any]) => {
      const option = document.createElement('option');
      option.value = providerId;
      option.textContent = providerData.name || providerId;

      if (providerId === currentProvider) {
        option.selected = true;
      }

      providerSelect.appendChild(option);
    });


  }

  private updateModelDropdown(provider: any, currentModel: string): void {
    const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement;
    if (!modelSelect) return;

    // Check if provider exists and has models
    if (!provider || !provider.models || !Array.isArray(provider.models)) {
      console.warn('🦊 Invalid provider data for model dropdown:', provider);
      modelSelect.innerHTML = '<option value="">No models available</option>';
      return;
    }

    // Clear existing options
    modelSelect.innerHTML = '';

    // Add model options
    provider.models.forEach((model: string) => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = this.getModelDisplayName(model);
      if (model === currentModel) {
        option.selected = true;
      }
      modelSelect.appendChild(option);
    });
  }

  private getModelDisplayName(model: string): string {
    const modelNames: Record<string, string> = {
      'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5',
      'claude-sonnet-4-20250514': 'Claude Sonnet 4',
      'claude-3-5-haiku-20241022': 'Claude Haiku 3.5',
      'claude-3-haiku-20240307': 'Claude Haiku 3',
      'gpt-4': 'GPT-4',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'deepseek-chat': 'DeepSeek Chat',
      'deepseek-coder': 'DeepSeek Coder',
      'ollama': 'Ollama',
      'lm-studio': 'LM Studio'
    };
    return modelNames[model] || model;
  }

  private updateSessionStats(tokens: number = 0, cost: number = 0): void {
    this.state.sessionStats.totalTokens += tokens;
    this.state.sessionStats.totalCost += cost;
    this.state.sessionStats.messageCount += 1;

    if (this.elements.sessionTokens) {
      this.elements.sessionTokens.textContent = this.state.sessionStats.totalTokens.toLocaleString();
    }

    if (this.elements.sessionCost) {
      this.elements.sessionCost.textContent = '$' + this.state.sessionStats.totalCost.toFixed(4);
    }

    // Update session summary if it exists
    this.updateSessionSummary();
  }

  /**
   * Update session summary display
   */
  private updateSessionSummary(): void {
    let summaryEl = document.getElementById('sessionSummary');
    if (!summaryEl) {
      // Create session summary element
      summaryEl = document.createElement('div');
      summaryEl.id = 'sessionSummary';
      summaryEl.className = 'session-summary';

      // Insert after cost tracker
      const costTracker = document.getElementById('costTracker');
      if (costTracker && costTracker.parentNode) {
        costTracker.parentNode.insertBefore(summaryEl, costTracker.nextSibling);
      }
    }

    const sessionDuration = this.getSessionDuration();
    const avgCostPerMessage = this.state.sessionStats.messageCount > 0
      ? (this.state.sessionStats.totalCost / this.state.sessionStats.messageCount).toFixed(4)
      : '0.0000';

    summaryEl.innerHTML = `
      <span class="session-messages">${this.state.sessionStats.messageCount} messages</span>
      <span>•</span>
      <span>${sessionDuration}</span>
      <span>•</span>
      <span>$${avgCostPerMessage}/msg avg</span>
    `;
  }

  /**
   * Get formatted session duration
   */
  private getSessionDuration(): string {
    const startTime = new Date(this.state.sessionStats.startTime);
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.elements.messagesContainer) {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
      }
    }, 100);
  }

  /**
   * 🎤 Initialize Web Speech API
   */
  private initializeSpeechRecognition(): void {
    // Check for speech recognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.speechSupported = false;
      if (this.elements.micBtn) {
        this.elements.micBtn.disabled = true;
        this.elements.micBtn.title = 'Voice input not supported in this browser';
      }
      this.showVoiceError('Voice recognition is not supported in this browser. Please use a Chromium-based browser.', false);
      return;
    }

    this.speechSupported = true;
    this.speechRecognition = new SpeechRecognition();

    // Configure speech recognition
    this.speechRecognition.continuous = true;
    this.speechRecognition.interimResults = true;
    this.speechRecognition.lang = 'en-US';

    // Event handlers
    this.speechRecognition.onstart = () => {
      this.isRecording = true;
      this.updateMicButtonState();
    };

    this.speechRecognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update the input field with the transcript
      if (this.elements.messageInput) {
        const currentValue = this.elements.messageInput.value;
        const newValue = currentValue + finalTranscript;
        this.elements.messageInput.value = newValue;

        // Show interim results as placeholder
        if (interimTranscript) {
          this.elements.messageInput.placeholder = `Listening: "${interimTranscript}"`;
        }

        this.autoResizeTextarea();
      }
    };

    this.speechRecognition.onerror = (event: any) => {
      console.error('🎤 Speech recognition error:', event.error);
      this.isRecording = false;
      this.updateMicButtonState();

      let errorMessage = 'Voice recognition error';
      let showPermissionButton = false;

      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try speaking clearly and try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not accessible. Please check your microphone connection.';
          showPermissionButton = true;
          this.permissionState = 'denied';
          break;
        case 'not-allowed':
          errorMessage = '🔒 Microphone blocked by VS Code security. Click "Enable Microphone" for solutions.';
          showPermissionButton = true;
          this.permissionState = 'denied';
          break;
        case 'network':
          errorMessage = 'Network error during voice recognition. Please check your connection.';
          break;
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service not available. Please try again later.';
          break;
        default:
          errorMessage = `Voice recognition failed: ${event.error}. Please try again.`;
      }

      this.showVoiceError(errorMessage, showPermissionButton);
    };

    this.speechRecognition.onend = () => {
      this.isRecording = false;
      this.updateMicButtonState();

      // Reset placeholder
      if (this.elements.messageInput) {
        this.elements.messageInput.placeholder = 'Ask Nox anything about your code...';
      }
    };
  }

  /**
   * 🎤 Toggle voice recording - Mic button toggles between mic and stop icon
   */
  private async toggleVoiceRecording(): Promise<void> {
    // Hide any previous error messages
    this.hideVoiceError();

    if (this.isRecording) {
      // Stop recording (mic button shows stop icon, user clicked to stop)
      this.sendMessage({
        type: 'stopVoiceRecording'
      });
      console.log('🎤 Stop voice recording requested from mic button toggle');
    } else {
      // Start recording (mic button shows mic icon, user clicked to start)
      this.startSimpleVoiceRecording();
    }
  }

  /**
   * 🎤 Update microphone button visual state based on settings and recording state
   */
  private updateMicButtonState(): void {
    if (!this.elements.micBtn) return;

    // Request current voice settings from extension
    this.sendMessage({ type: 'getVoiceStatus' });
  }

  /**
   * 🎤 Handle voice status response from extension
   */
  private handleVoiceStatus(status: any): void {
    if (!status) return;

    // Check if any engine is available
    const hasValidEngine = status.engines.free || status.engines.openai || status.engines.google;

    // Update mic button state
    this.updateMicButtonWithSettings(status.enabled, hasValidEngine);
  }

  /**
   * 🎤 Update mic button state with voice settings
   */
  private updateMicButtonWithSettings(voiceEnabled: boolean, hasValidEngine: boolean): void {
    if (!this.elements.micBtn) return;

    if (!voiceEnabled) {
      // Voice is disabled in settings
      this.elements.micBtn.disabled = true;
      this.elements.micBtn.classList.remove('recording');
      this.elements.micBtn.title = 'Voice input is disabled. Enable it in Nox Settings.';
      return;
    }

    if (!hasValidEngine) {
      // No valid voice engine configured
      this.elements.micBtn.disabled = true;
      this.elements.micBtn.classList.remove('recording');
      this.elements.micBtn.title = 'No voice engine configured. Set up API keys in Nox Settings.';
      return;
    }

    // Voice is enabled and has valid engine
    this.elements.micBtn.disabled = false;

    if (this.isRecording) {
      // Recording state: show stop icon, red styling
      this.elements.micBtn.classList.add('recording');
      this.elements.micBtn.title = 'Stop recording (click to stop)';
    } else {
      // Idle state: show mic icon, normal styling
      this.elements.micBtn.classList.remove('recording');
      if (this.permissionState === 'denied') {
        this.elements.micBtn.title = 'Microphone permission denied - click to enable';
      } else {
        this.elements.micBtn.title = 'Voice input (click to start recording)';
      }
    }
  }

  /**
   * 🎤 Show voice recognition error with professional UI
   */
  private showVoiceError(message: string, showPermissionButton: boolean = false): void {
    console.error('🎤 Voice error:', message);

    if (!this.elements.voiceError) return;

    const errorText = this.elements.voiceError.querySelector('.error-text');
    const errorAction = this.elements.voiceError.querySelector('.error-action') as HTMLButtonElement;

    if (errorText) {
      errorText.textContent = message;
    }

    if (errorAction) {
      if (showPermissionButton) {
        errorAction.style.display = 'block';
        errorAction.textContent = 'Enable Microphone';
        errorAction.onclick = () => this.requestMicrophonePermission();
      } else {
        errorAction.style.display = 'none';
      }
    }

    this.elements.voiceError.style.display = 'block';

    // Auto-hide non-permission errors after 5 seconds
    if (!showPermissionButton) {
      setTimeout(() => {
        this.hideVoiceError();
      }, 5000);
    }
  }

  /**
   * 🎤 Hide voice error message
   */
  private hideVoiceError(): void {
    if (this.elements.voiceError) {
      this.elements.voiceError.style.display = 'none';
    }
  }

  /**
   * 🎤 Request microphone permission explicitly
   */
  private async requestMicrophonePermission(): Promise<void> {
    try {
      // Show immediate feedback
      this.showVoiceError('🎤 Attempting to enable microphone access...', false);

      // Method 1: Try getUserMedia with explicit permission request
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          console.log('🎤 Trying getUserMedia with explicit permission...');

          // Request permission explicitly
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });

          // Permission granted - clean up the stream
          stream.getTracks().forEach(track => track.stop());

          this.permissionState = 'granted';
          this.hideVoiceError();
          this.updateMicButtonState();

          this.showVoiceError('✅ Microphone access granted! Click the microphone button to start voice input.', false);

          // Auto-hide success message after 3 seconds
          setTimeout(() => this.hideVoiceError(), 3000);
          return;

        } catch (userMediaError: any) {
          console.log('🎤 getUserMedia failed:', userMediaError.name, userMediaError.message);

          if (userMediaError.name === 'NotAllowedError') {
            // VS Code blocks webview microphone - use simple approach
            this.showVoiceError('🔒 VS Code blocks microphone in webviews. Using extension backend instead...', false);
            this.startSimpleVoiceRecording();
            return;
          }
        }
      }

      // Method 2: Try direct speech recognition permission test
      if (this.speechRecognition) {
        try {

          // Create a promise to handle the permission test
          const permissionTest = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Permission test timeout'));
            }, 2000);

            this.speechRecognition.onstart = () => {
              clearTimeout(timeout);
              this.speechRecognition.stop();
              resolve('granted');
            };

            this.speechRecognition.onerror = (event: any) => {
              clearTimeout(timeout);
              reject(event);
            };

            this.speechRecognition.start();
          });

          await permissionTest;

          this.permissionState = 'granted';
          this.hideVoiceError();
          this.updateMicButtonState();

          this.showVoiceError('✅ Voice recognition enabled! Click the microphone button to start.', false);

          // Auto-hide success message after 3 seconds
          setTimeout(() => this.hideVoiceError(), 3000);
          return;

        } catch (speechError: any) {
          // Permission test failed, continue to next method
        }
      }

      // Method 3: Use simple voice recording via extension
      this.showVoiceError('🔒 VS Code blocks microphone in webviews. Using extension backend instead...', false);
      this.startSimpleVoiceRecording();

    } catch (error: any) {
      console.error('🎤 Permission request failed:', error);
      this.showVoiceError('🔒 VS Code blocks microphone in webviews. Using extension backend instead...', false);
      this.startSimpleVoiceRecording();
    }
  }

  /**
   * 🎤 Start simple voice recording via extension backend
   */
  private startSimpleVoiceRecording(): void {
    // Send message to extension to start voice recording
    this.sendMessage({
      type: 'startVoiceRecording'
    });
    console.log('🎤 Starting simple voice recording via extension');
  }

  /**
   * Handle delete confirmation from user
   */
  private handleConfirmDelete(messageId: string): void {
    // Show a visual confirmation in the UI instead of a modal
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageEl) return;

    // Find the delete button
    const deleteBtn = messageEl.querySelector('.message-action-btn.delete') as HTMLButtonElement;
    if (!deleteBtn) return;

    // Change button appearance to show confirmation state
    const originalText = deleteBtn.textContent;
    deleteBtn.textContent = '🗑️ Confirm?';
    deleteBtn.style.background = 'rgba(244, 114, 182, 0.3)';
    deleteBtn.style.borderColor = 'var(--aurora-pink)';

    // Create a cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'message-action-btn';
    cancelBtn.textContent = '❌ Cancel';
    cancelBtn.style.color = 'var(--aurora-blue)';
    cancelBtn.style.borderColor = 'rgba(76, 154, 255, 0.3)';
    cancelBtn.style.background = 'rgba(76, 154, 255, 0.1)';

    // Insert cancel button next to delete button
    deleteBtn.parentNode?.insertBefore(cancelBtn, deleteBtn.nextSibling);

    // Handle confirm
    const confirmHandler = () => {
      this.sendMessage({
        type: 'deleteMessage',
        messageId: messageId
      } as any);
      deleteBtn.textContent = originalText;
      deleteBtn.style.background = '';
      deleteBtn.style.borderColor = '';
      deleteBtn.onclick = () => this.handleConfirmDelete(messageId);
      cancelBtn.remove();
    };

    // Handle cancel
    const cancelHandler = () => {
      deleteBtn.textContent = originalText;
      deleteBtn.style.background = '';
      deleteBtn.style.borderColor = '';
      deleteBtn.onclick = () => this.handleConfirmDelete(messageId);
      cancelBtn.remove();
    };

    deleteBtn.onclick = confirmHandler;
    cancelBtn.onclick = cancelHandler;
  }

  /**
   * 🌊 Start streaming message display
   */
  private startStreamingMessage(messageId: string): void {
    if (!this.elements.messagesContainer) return;

    // Hide thinking indicator if showing
    this.showThinking(false);

    // Create streaming message element
    const streamingEl = StreamingMessageComponent.create(messageId);
    this.elements.messagesContainer.appendChild(streamingEl);

    // Set AI responding state
    this.state.isAIResponding = true;

    // Scroll to show new streaming message
    this.scrollToBottom();

    console.log('🌊 Started streaming message:', messageId);
  }

  /**
   * 🌊 Update streaming message with new content chunk
   */
  private updateStreamingMessage(messageId: string, chunk: string, tokens?: number): void {
    StreamingMessageComponent.updateContent(messageId, chunk, tokens);

    // ✅ SCROLL FREEDOM FIX: No auto-scroll during streaming chunks
    // User can now scroll freely while streaming continues at bottom
    // Only scroll when streaming starts/completes, not on every chunk

    if (this.debugMode) {
      console.log('🌊 Updated streaming message:', messageId, 'chunk length:', chunk.length, 'tokens:', tokens);
    }
  }

  /**
   * 🌊 Complete streaming message and convert to regular message
   */
  private completeStreamingMessage(messageId: string, finalMessage: ChatMessage): void {
    // Complete the streaming component
    StreamingMessageComponent.completeStreaming(messageId, finalMessage);

    // Update session stats
    this.updateSessionStats(finalMessage.tokens, finalMessage.cost);

    // Update state
    this.state.isAIResponding = false;
    this.state.chatHistory.push(finalMessage);

    // Final scroll to show completed message
    this.scrollToBottom();

    console.log('🌊 Completed streaming message:', messageId, 'final tokens:', finalMessage.tokens);
  }

  /**
   * 🌊 Handle streaming error
   */
  private handleStreamingError(messageId: string, error: string): void {
    StreamingMessageComponent.handleStreamingError(messageId, error);

    // Reset AI responding state
    this.state.isAIResponding = false;

    console.error('🌊 Streaming error for message:', messageId, error);
  }

  /**
   * ⏹️ Handle stream stopped
   */
  private handleStreamStopped(messageId: string, partialContent?: string): void {
    StreamingMessageComponent.handleStreamStopped(messageId, partialContent);

    // Reset AI responding state
    this.state.isAIResponding = false;

    console.log('⏹️ Stream stopped for message:', messageId);
  }

  /**
   * 🦊 Handle Git operation result
   */
  private handleGitOperationResult(message: any): void {
    console.log('🦊 Git operation result:', message);

    // Create a Git result message to display
    const gitMessage: ChatMessage = {
      id: `git-${Date.now()}`,
      type: 'assistant',
      content: this.formatGitResult(message.operation, message.result),
      timestamp: new Date().toISOString(),
      tokens: 0,
      cost: 0
    };

    this.addMessage(gitMessage);
    this.scrollToBottom();
  }

  /**
   * 🦊 Handle Git operation error
   */
  private handleGitOperationError(message: any): void {
    console.error('🦊 Git operation error:', message);

    // Create a Git error message to display
    const errorMessage: ChatMessage = {
      id: `git-error-${Date.now()}`,
      type: 'assistant',
      content: `❌ **Git Operation Failed**\n\n**Operation**: ${message.operation.description}\n\n**Error**: ${message.error}`,
      timestamp: new Date().toISOString(),
      tokens: 0,
      cost: 0
    };

    this.addMessage(errorMessage);
    this.scrollToBottom();
  }

  /**
   * 🦊 Format Git operation result for display
   */
  private formatGitResult(operation: any, result: any): string {
    switch (operation.type) {
      case 'git_status':
        return this.formatGitStatus(result);
      case 'git_commit':
        return this.formatGitCommit(result);
      case 'git_push':
        return this.formatGitPush(result);
      default:
        return `✅ **${operation.description}**\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
    }
  }

  /**
   * 🦊 Format Git status result
   */
  private formatGitStatus(result: any): string {
    if (!result.success) {
      return `❌ **Git Status Failed**\n\n${result.message || result.error}`;
    }

    const status = result.result;
    let content = `📊 **Git Repository Status**\n\n`;

    if (!status.isRepo) {
      content += `❌ Not a Git repository`;
      return content;
    }

    content += `🌿 **Branch**: ${status.branch}\n`;
    content += `📝 **Changes**: ${status.changes.length} file(s)\n\n`;

    if (status.changes.length > 0) {
      content += `**Modified Files:**\n`;
      for (const change of status.changes) {
        const icon = change.status === 'M' ? '📝' : change.status === 'A' ? '➕' : change.status === 'D' ? '❌' : '❓';
        content += `${icon} ${change.file} (${change.status})\n`;
      }
    } else {
      content += `✅ Working directory clean`;
    }

    return content;
  }

  /**
   * 🦊 Format Git commit result
   */
  private formatGitCommit(result: any): string {
    if (!result.success) {
      return `❌ **Git Commit Failed**\n\n${result.message || result.error}`;
    }

    return `✅ **Commit Successful**\n\n**Hash**: \`${result.result.hash}\`\n**Message**: ${result.result.message}\n**Files**: ${result.result.files.length} file(s)`;
  }

  /**
   * 🦊 Format Git push result
   */
  private formatGitPush(result: any): string {
    if (!result.success) {
      return `❌ **Git Push Failed**\n\n${result.message || result.error}`;
    }

    return `✅ **Push Successful**\n\n**Branch**: ${result.result.branch}\n**Remote**: ${result.result.remote}`;
  }
}

// Make NoxChatApp available globally for debugging and external access
(window as any).NoxChatApp = NoxChatApp;

// Initialize the app when the script loads
// Use IIFE to force immediate execution with comprehensive error handling
(() => {
  try {
    const app = new NoxChatApp();
    (window as any).noxApp = app;
  } catch (error) {
    console.error('🦊 [WEBVIEW] ❌ CRITICAL ERROR during NoxChatApp instantiation:', error);
    console.error('🦊 [WEBVIEW] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('🦊 [WEBVIEW] Error message:', error instanceof Error ? error.message : String(error));

    // Display error in the UI
    document.addEventListener('DOMContentLoaded', () => {
      const body = document.body;
      if (body) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
          position: fixed;
          top: 20px;
          left: 20px;
          right: 20px;
          background: #ef4444;
          color: white;
          padding: 16px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 12px;
          z-index: 10000;
          white-space: pre-wrap;
        `;
        errorDiv.textContent = `❌ CRITICAL ERROR: Failed to initialize Nox Chat\n\n${error instanceof Error ? error.message : String(error)}\n\nCheck browser console for details.`;
        body.appendChild(errorDiv);
      }
    });
  }
})();

// Test markdown rendering on load

const renderer = NoxMarkdownRenderer.getInstance();
const testMarkdown = `
# 🦊 Nox Markdown Test

This is a **bold** test with *italic* text and \`inline code\`.

## Code Block Example

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}! 🦊\`);
  return \`Welcome to Nox!\`;
}

greet('Developer');
\`\`\`

## Features

- ✅ **Syntax highlighting** for 190+ languages
- ✅ **Aurora theming** with beautiful colors
- ✅ **Interactive code blocks** with copy buttons
- ✅ **XSS protection** with DOMPurify

> This is a blockquote with Aurora styling!

[Visit Augment Code](https://augmentcode.com) for more enterprise tools.
`;

const rendered = renderer.render(testMarkdown);

