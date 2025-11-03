/**
 * 🦊 Nox Webview Type Definitions
 * Enterprise-grade TypeScript interfaces for webview communication
 */

// VS Code API type
export interface VSCodeAPI {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

// Message types for extension <-> webview communication
export interface BaseMessage {
  type: string;
}

export interface SendMessageRequest extends BaseMessage {
  type: 'sendMessage';
  content: string;
}

export interface SendStreamingMessageRequest extends BaseMessage {
  type: 'sendStreamingMessage';
  content: string;
}

export interface ProviderChangeRequest extends BaseMessage {
  type: 'changeProvider';
  provider: string;
}

export interface ModelChangeRequest extends BaseMessage {
  type: 'changeModel';
  model: string;
}

export interface ClearHistoryRequest extends BaseMessage {
  type: 'clearHistory';
}

export interface ClearChatRequest extends BaseMessage {
  type: 'clearChat';
}

export interface ReadyMessage extends BaseMessage {
  type: 'ready';
}

export interface GetProviderStatusRequest extends BaseMessage {
  type: 'getProviderStatus';
}

export interface ProviderSectionToggledRequest extends BaseMessage {
  type: 'providerSectionToggled';
  collapsed: boolean;
}

export interface ConfirmDeleteRequest extends BaseMessage {
  type: 'confirmDelete';
  messageId: string;
}

export interface DeleteMessageRequest extends BaseMessage {
  type: 'deleteMessage';
  messageId: string;
}

export interface RegenerateMessageRequest extends BaseMessage {
  type: 'regenerateMessage';
  messageId: string;
}

// Streaming message types
export interface StreamStartRequest extends BaseMessage {
  type: 'streamStart';
  messageId: string;
}

export interface StreamChunkRequest extends BaseMessage {
  type: 'streamChunk';
  messageId: string;
  chunk: string;
  tokens?: number;
  isComplete?: boolean;
}

export interface StreamStopRequest extends BaseMessage {
  type: 'streamStop';
  messageId: string;
}

export interface StreamCompleteRequest extends BaseMessage {
  type: 'streamComplete';
  messageId: string;
  finalMessage: ChatMessage;
}

export interface StreamStoppedRequest extends BaseMessage {
  type: 'streamStopped';
  messageId: string;
  partialContent?: string;
}

export interface StreamContinueRequest extends BaseMessage {
  type: 'streamContinue';
  messageId: string;
}

// Response message types
export interface UserMessageResponse extends BaseMessage {
  type: 'userMessage';
  message: ChatMessage;
}

export interface AIMessageResponse extends BaseMessage {
  type: 'aiMessage';
  message: ChatMessage;
}

export interface AIThinkingResponse extends BaseMessage {
  type: 'aiThinking';
  thinking: boolean;
}

export interface ErrorResponse extends BaseMessage {
  type: 'error';
  message: string | EnhancedError;
}

export interface ClearMessagesResponse extends BaseMessage {
  type: 'clearMessages';
}

export interface LoadHistoryResponse extends BaseMessage {
  type: 'loadHistory';
  history: ChatMessage[];
}

export interface ProviderStatusResponse extends BaseMessage {
  type: 'providerStatus';
  currentProvider: string;
  currentModel: string;
  providers: Record<string, ProviderInfo>;
}

// Streaming response message types
export interface StreamStartResponse extends BaseMessage {
  type: 'streamStart';
  messageId: string;
}

export interface StreamChunkResponse extends BaseMessage {
  type: 'streamChunk';
  messageId: string;
  chunk: string;
  tokens?: number;
  isComplete?: boolean;
}

export interface StreamCompleteResponse extends BaseMessage {
  type: 'streamComplete';
  messageId: string;
  finalMessage: ChatMessage;
}

export interface StreamStoppedResponse extends BaseMessage {
  type: 'streamStopped';
  messageId: string;
  partialContent?: string;
}

// Chat message structure
export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  tokens?: number;
  cost?: number;
  provider?: string;
  model?: string;
}

// Provider information
export interface ProviderInfo {
  name: string;
  models: string[];
  hasApiKey: boolean;
  isActive: boolean;
}

// Enhanced error structure
export interface EnhancedError {
  message: string;
  enhancedInfo?: {
    title: string;
    suggestion?: string;
    helpUrl?: string;
  };
}

// UI Component interfaces
export interface MessageComponentProps {
  message: ChatMessage;
  onCopy?: (content: string) => void;
  onRegenerate?: (messageId: string) => void;
}

export interface CodeBlockProps {
  code: string;
  language: string;
  copyable?: boolean;
  showLineNumbers?: boolean;
}

export interface ProviderSelectorProps {
  currentProvider: string;
  providers: Record<string, ProviderInfo>;
  onProviderChange: (provider: string) => void;
}

export interface ModelSelectorProps {
  currentModel: string;
  models: string[];
  onModelChange: (model: string) => void;
}

// Session tracking
export interface SessionStats {
  totalTokens: number;
  totalCost: number;
  messageCount: number;
  startTime: string;
}

// Webview state
export interface WebviewState {
  chatHistory: ChatMessage[];
  sessionStats: SessionStats;
  currentProvider: string;
  currentModel: string;
  isAIResponding: boolean;
  isInitialized: boolean; // 🔧 FIX: Track initialization state to prevent first-interaction glitch
}
