const vscode = require("vscode");
const VoiceRecordingService = require("../core/voiceRecordingService");

/**
 * 🦊 Nox Chat Sidebar - WebviewViewProvider for Sidebar Integration
 * Aurora-themed chat interface embedded in VS Code sidebar (like Augment chat)
 */
class NoxChatViewProvider {
  constructor(context, agentController, logger, themeService) {
    this.context = context;
    this.agentController = agentController;
    this.logger = logger;
    this.themeService = themeService;

    // Initialize voice recording service
    this.voiceRecordingService = new VoiceRecordingService(logger, context);
    this.webviewView = null;
    this.disposables = [];
    this.chatHistory = [];
    this.isAIResponding = false;
    this.activeStreams = new Map(); // Track active streaming requests
  }

  /**
   * 🎨 WebviewViewProvider interface - called when view is first shown
   */
  resolveWebviewView(webviewView, context, token) {
    this.webviewView = webviewView;

    // Configure webview
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
      enableCommandUris: true,
      retainContextWhenHidden: true,
      // Enable forms for potential file uploads
      enableForms: true,
      // Allow unsafe inline for media handling
      enableFindWidget: true,
    };

    // Set initial content
    webviewView.webview.html = this.getWebviewContent();

    // Setup message handling (must be done before content loads)
    this.setupMessageHandling();

    // Setup view events
    this.setupViewEvents();

    this.logger.info("🦊 Nox chat sidebar initialized successfully");
  }

  /**
   * 🔧 Setup message handling between webview and extension
   */
  setupMessageHandling() {
    this.logger.info("🦊 Setting up message handling...");

    this.webviewView.webview.onDidReceiveMessage(
      async (message) => {
        try {
          this.logger.info("🦊 Received message from webview:", message);

          switch (message.type) {
            case "sendMessage":
              await this.handleUserMessage(message.content);
              break;

            case "sendStreamingMessage":
              await this.handleStreamingMessage(message.content);
              break;

            case "streamStop":
              await this.handleStreamStop(message.messageId);
              break;

            case "streamContinue":
              await this.handleStreamContinue(message.messageId);
              break;

            case "clearHistory":
              await this.clearChatHistory();
              break;

            case "resetAI":
              this.resetAIState();
              break;

            case "ready":
              await this.handleWebviewReady();
              break;

            case "openSettings":
              await vscode.commands.executeCommand("nox.settings");
              break;

            case "changeProvider":
              await this.handleProviderChange(message.provider);
              break;

            case "changeModel":
              await this.handleModelChange(message.model);
              break;

            case "getProviderStatus":
              this.logger.info("🦊 Handling getProviderStatus request");
              await this.sendProviderStatus();
              break;

            case "confirmDelete":
              // Send confirmation request to webview
              this.sendMessageToWebview({
                type: "confirmDelete",
                messageId: message.messageId,
              });
              break;

            case "deleteMessage":
              await this.handleDeleteMessage(message.messageId);
              break;

            case "regenerateMessage":
              await this.handleRegenerateMessage(message.messageId);
              break;

            case "clearChat":
              this.clearChatHistory();
              break;

            case "openUrl":
              if (message.url) {
                await vscode.env.openExternal(vscode.Uri.parse(message.url));
              }
              break;

            case "providerSectionToggled":
              // Update the toggle button icon based on collapsed state
              await this.updateToggleButtonIcon(message.collapsed);
              break;

            case "startVoiceRecording":
              // Start simple voice recording via extension backend
              this.logger.info(
                "🎤 Starting voice recording via extension backend"
              );
              await this.startVoiceRecording();
              break;

            case "stopVoiceRecording":
              // Stop voice recording via extension backend (from mic button toggle)
              this.logger.info(
                "🎤 Stopping voice recording via mic button toggle"
              );
              await this.stopVoiceRecording();
              break;

            case "getVoiceStatus":
              // Send current voice status to webview
              await this.sendVoiceStatus();
              break;

            case "injectCSS":
              // Handle CSS injection for Aurora theme animations
              this.logger.info(
                `🎨 Injecting CSS for theme: ${message.theme?.name}`
              );
              this.sendMessageToWebview({
                type: "injectCSS",
                script: message.script,
                theme: message.theme,
              });
              break;

            case "themeChanged":
              // Handle theme change notifications
              this.logger.info(
                `🎨 Theme changed notification: ${message.theme?.name}`
              );
              this.sendMessageToWebview({
                type: "themeChanged",
                theme: message.theme,
              });
              break;

            default:
              this.logger.warn(`Unknown message type: ${message.type}`);
          }
        } catch (error) {
          this.logger.error("Error handling webview message:", error);
          this.sendErrorToWebview(error.message);
        }
      },
      undefined,
      this.disposables
    );
  }

  /**
   * 🤖 Handle user message and get AI response
   */
  async handleUserMessage(userMessage) {
    if (!userMessage?.trim()) {
      return;
    }

    if (this.isAIResponding) {
      this.sendMessageToWebview({
        type: "error",
        message: "Please wait for the current response to complete.",
      });
      return;
    }

    try {
      this.isAIResponding = true;

      // Add user message to history
      const userMessageObj = {
        id: Date.now().toString(),
        type: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
      };

      this.chatHistory.push(userMessageObj);
      this.saveChatHistory();

      // Send user message to webview
      this.sendMessageToWebview({
        type: "userMessage",
        message: userMessageObj,
      });

      // Show AI thinking indicator
      this.sendMessageToWebview({
        type: "aiThinking",
        thinking: true,
      });

      // Get AI response using NOX consciousness system
      const aiResponse = await this.agentController.executeTask("chat", {
        message: userMessage,
        maxTokens: 4000,
      });

      // Hide thinking indicator
      this.sendMessageToWebview({
        type: "aiThinking",
        thinking: false,
      });

      // Add AI response to history
      const aiMessageObj = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: aiResponse.content,
        timestamp: new Date().toISOString(),
        tokens: aiResponse.tokens || 0,
        cost: aiResponse.cost || 0,
        provider: aiResponse.provider || "unknown",
        model: aiResponse.model || "unknown",
      };

      this.chatHistory.push(aiMessageObj);
      this.saveChatHistory();

      // Send AI response to webview
      this.sendMessageToWebview({
        type: "aiMessage",
        message: aiMessageObj,
      });

      // 🔴 PHASE 3: Execute capabilities from AI response
      this.logger.info(
        `🔍 DEBUG: aiResponse.capabilities exists: ${!!aiResponse.capabilities}`
      );
      if (aiResponse.capabilities) {
        this.logger.info(
          `🔍 DEBUG: capabilities object:`,
          aiResponse.capabilities
        );
        this.logger.info(
          `🔍 DEBUG: requiresApproval length: ${
            aiResponse.capabilities.requiresApproval?.length || 0
          }`
        );
        await this.executeCapabilitiesFromResponse(aiResponse.capabilities);
      } else {
        this.logger.warn(`🔍 DEBUG: No capabilities detected in AI response`);
      }

      this.logger.info(
        `🦊 Chat exchange completed (${
          aiResponse.usage?.total_tokens || 0
        } tokens)`
      );
    } catch (error) {
      this.logger.error("Error in chat exchange:", error);
      this.sendErrorToWebview(error.message);
    } finally {
      this.isAIResponding = false;
    }
  }

  /**
   * 🌊 Handle streaming user message and get real-time AI response
   */
  async handleStreamingMessage(userMessage) {
    if (!userMessage?.trim()) {
      return;
    }

    this.logger.info(
      `🌊 handleStreamingMessage called, isAIResponding: ${this.isAIResponding}`
    );

    if (this.isAIResponding) {
      this.logger.warn("AI is already responding, rejecting new message");
      this.sendMessageToWebview({
        type: "error",
        message: "Please wait for the current response to complete.",
      });
      return;
    }

    // Generate unique message ID for streaming (declare outside try block)
    const streamingMessageId = (Date.now() + 1).toString();

    try {
      this.isAIResponding = true;

      // Add user message to history
      const userMessageObj = {
        id: Date.now().toString(),
        type: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
      };

      this.chatHistory.push(userMessageObj);
      this.saveChatHistory();

      // Send user message to webview
      this.sendMessageToWebview({
        type: "userMessage",
        message: userMessageObj,
      });

      // Create abort controller for this stream
      const abortController = new AbortController();

      // 🔍 PHASE 1 DIAGNOSTICS: Track AbortController object identity
      const abortControllerID = `AC_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      abortController._debugID = abortControllerID;
      console.log(
        `🔍 BACKEND: Created AbortController for ${streamingMessageId} with ID: ${abortControllerID}`
      );
      console.log(
        `🔍 BACKEND: AbortController object reference: ${abortController.toString()}`
      );
      console.log(
        `🔍 BACKEND: Initial signal.aborted state: ${abortController.signal.aborted}`
      );

      this.activeStreams.set(streamingMessageId, abortController);

      // Start streaming UI
      this.sendMessageToWebview({
        type: "streamStart",
        messageId: streamingMessageId,
      });

      // Set up streaming callbacks
      const onChunk = (chunkData) => {
        this.sendMessageToWebview({
          type: "streamChunk",
          messageId: chunkData.messageId,
          chunk: chunkData.chunk,
          tokens: chunkData.tokens,
          isComplete: chunkData.isComplete,
        });
      };

      const onComplete = async (finalMessage) => {
        // Add final message to history
        this.chatHistory.push(finalMessage);
        this.saveChatHistory();

        // Send completion to webview
        this.sendMessageToWebview({
          type: "streamComplete",
          messageId: streamingMessageId,
          finalMessage: finalMessage,
        });

        // 🦊 NOX: Check for Git operations after streaming completes
        try {
          const gitOperations = this.agentController.detectGitOperations(
            userMessage,
            finalMessage.content || ""
          );

          for (const gitOp of gitOperations) {
            if (gitOp.autoExecute) {
              try {
                this.logger.info(
                  `🦊 Auto-executing Git operation: ${gitOp.type}`
                );
                const gitResult = await this.agentController.executeCapability(
                  gitOp,
                  noxContext
                );

                // Send Git result to webview
                this.sendMessageToWebview({
                  type: "gitOperationResult",
                  messageId: streamingMessageId,
                  operation: gitOp,
                  result: gitResult,
                });
              } catch (error) {
                this.logger.error(
                  `Failed to execute Git operation ${gitOp.type}:`,
                  error
                );
                this.sendMessageToWebview({
                  type: "gitOperationError",
                  messageId: streamingMessageId,
                  operation: gitOp,
                  error: error.message,
                });
              }
            }
          }
        } catch (error) {
          this.logger.error("Error processing Git operations:", error);
        }

        // 🔧 FIX: Don't immediately clean up AbortController - keep it for potential stop requests
        // Only clean up after a delay to allow stop button to work even after completion
        setTimeout(() => {
          this.activeStreams.delete(streamingMessageId);
          console.log(
            `🔧 FIX: Delayed cleanup of AbortController for ${streamingMessageId}`
          );
        }, 5000); // 5 second delay

        this.isAIResponding = false;

        this.logger.info(
          `🌊 Streaming chat exchange completed (${
            finalMessage.tokens || 0
          } tokens)`
        );
      };

      // 🔍 PHASE 1 DIAGNOSTICS: Pre-call verification
      console.log(
        `🔍 BACKEND: About to call sendStreamingRequest for ${streamingMessageId}`
      );
      console.log(
        `🔍 BACKEND: Passing AbortController ID: ${
          abortController._debugID || "NO_ID"
        }`
      );
      console.log(
        `🔍 BACKEND: Passing AbortController reference: ${abortController.toString()}`
      );
      console.log(
        `🔍 BACKEND: Signal state before call: ${abortController.signal.aborted}`
      );

      // Get streaming AI response using NOX consciousness system
      // Build NOX context and prompts
      const noxContext = await this.agentController.buildNoxContext("chat", {
        message: userMessage,
      });
      const systemPrompt = this.agentController.buildNoxSystemPrompt(
        "chat",
        noxContext
      );
      const taskPrompt = this.agentController.buildNoxTaskPrompt(
        "chat",
        { message: userMessage },
        noxContext
      );

      // Execute with NOX consciousness
      await this.agentController.executeNoxStreamingTask(
        systemPrompt,
        taskPrompt,
        {
          maxTokens: 4000,
          messageId: streamingMessageId,
        },
        onChunk,
        onComplete,
        abortController
      );
    } catch (error) {
      this.logger.error("Error in streaming chat exchange:", error);

      // Clean up active stream
      this.activeStreams.delete(streamingMessageId);
      this.isAIResponding = false; // CRITICAL: Reset the flag on error

      // Send streaming error
      this.sendMessageToWebview({
        type: "streamError",
        messageId: streamingMessageId,
        error: error.message,
      });

      this.sendErrorToWebview(error.message);
    } finally {
      this.isAIResponding = false;
    }
  }

  /**
   * ⏹️ Handle stream stop request
   */
  async handleStreamStop(messageId) {
    try {
      this.logger.info(`⏹️ Stopping stream: ${messageId}`);
      console.log(
        `🛑 BACKEND: Received stop request for message: ${messageId}`
      );
      console.log(
        `🛑 BACKEND: Active streams count: ${this.activeStreams.size}`
      );
      console.log(
        `🛑 BACKEND: Active streams keys:`,
        Array.from(this.activeStreams.keys())
      );

      // Get the abort controller for this stream
      const abortController = this.activeStreams.get(messageId);

      if (abortController) {
        console.log(
          `🛑 BACKEND: Found AbortController for ${messageId}, calling abort()`
        );

        // 🔍 PHASE 1 DIAGNOSTICS: Enhanced abort tracking
        console.log(
          `🔍 BACKEND: AbortController ID: ${
            abortController._debugID || "NO_ID"
          }`
        );
        console.log(
          `🔍 BACKEND: AbortController object reference: ${abortController.toString()}`
        );
        console.log(
          `🔍 BACKEND: Signal state BEFORE abort: ${abortController.signal.aborted}`
        );
        console.log(
          `🔍 BACKEND: Timestamp before abort: ${new Date().toISOString()}`
        );

        // Abort the request
        abortController.abort();

        console.log(
          `🔍 BACKEND: Signal state AFTER abort: ${abortController.signal.aborted}`
        );
        console.log(
          `🔍 BACKEND: Timestamp after abort: ${new Date().toISOString()}`
        );
        console.log(
          `🛑 BACKEND: AbortController.signal.aborted = ${abortController.signal.aborted}`
        );

        // Clean up
        this.activeStreams.delete(messageId);
        this.isAIResponding = false;

        // Send immediate confirmation to webview
        this.sendMessageToWebview({
          type: "streamStopped",
          messageId: messageId,
        });

        this.logger.info(`⏹️ Stream stopped successfully: ${messageId}`);
        console.log(
          `🛑 BACKEND: Stream stopped and cleaned up for ${messageId}`
        );
      } else {
        console.error(
          `🛑 BACKEND: NO ABORT CONTROLLER FOUND for messageId: ${messageId}`
        );
        console.log(
          `🛑 BACKEND: Available messageIds:`,
          Array.from(this.activeStreams.keys())
        );
        this.logger.warn(
          `⏹️ No active stream found for messageId: ${messageId}`
        );

        // Still send stopped message to update UI
        this.sendMessageToWebview({
          type: "streamStopped",
          messageId: messageId,
        });
      }
    } catch (error) {
      console.error(`🛑 BACKEND: Error stopping stream:`, error);
      this.logger.error("Error stopping stream:", error);
    }
  }

  /**
   * ▶️ Handle stream continue request - Resume streaming from where it stopped
   */
  async handleStreamContinue(messageId) {
    try {
      this.logger.info(`▶️ Continue stream requested: ${messageId}`);

      // Find the message in chat history to get the partial content
      const messageIndex = this.chatHistory.findIndex(
        (msg) => msg.id === messageId
      );
      if (messageIndex === -1) {
        this.logger.error(`Message not found in history: ${messageId}`);
        return;
      }

      const stoppedMessage = this.chatHistory[messageIndex];
      const partialContent = stoppedMessage.content || "";

      // Get the original user message (should be the previous message)
      const userMessage =
        messageIndex > 0 ? this.chatHistory[messageIndex - 1] : null;
      if (!userMessage || userMessage.type !== "user") {
        this.logger.error(
          `Could not find original user message for: ${messageId}`
        );
        return;
      }

      // Create a continuation prompt
      const continuationPrompt = `${userMessage.content}\n\n[Previous partial response: "${partialContent}"]\n\nPlease continue from where you left off, building naturally on the partial response above.`;

      // Create new abort controller for the continued stream
      const abortController = new AbortController();
      this.activeStreams.set(messageId, abortController);
      this.isAIResponding = true;

      // Set up streaming handlers
      const onChunk = (data) => {
        this.sendMessageToWebview({
          type: "streamChunk",
          messageId: messageId,
          chunk: data.chunk,
          tokens: data.tokens,
          isComplete: data.isComplete,
        });
      };

      const onComplete = (finalMessage) => {
        // Update the message in chat history with the complete content
        stoppedMessage.content = finalMessage.content;
        stoppedMessage.tokens = finalMessage.tokens;
        stoppedMessage.cost = finalMessage.cost;
        stoppedMessage.timestamp = new Date().toISOString();

        this.sendMessageToWebview({
          type: "streamComplete",
          messageId: messageId,
          finalMessage: finalMessage,
        });

        // 🔧 FIX: Don't immediately clean up AbortController - keep it for potential stop requests
        // Only clean up after a delay to allow stop button to work even after completion
        setTimeout(() => {
          this.activeStreams.delete(messageId);
          console.log(
            `🔧 FIX: Delayed cleanup of AbortController for continued stream ${messageId}`
          );
        }, 5000); // 5 second delay

        this.isAIResponding = false;

        this.logger.info(`🌊 Continued streaming completed for: ${messageId}`);
      };

      // Resume streaming with continuation prompt
      await this.agentController.aiClient.sendStreamingRequest(
        continuationPrompt,
        {
          maxTokens: 4000,
          messageId: messageId,
        },
        onChunk,
        onComplete,
        abortController
      );
    } catch (error) {
      this.logger.error("Error continuing stream:", error);

      // Clean up on error
      this.activeStreams.delete(messageId);
      this.isAIResponding = false;

      this.sendMessageToWebview({
        type: "streamError",
        messageId: messageId,
        error: "Failed to continue streaming. Please try again.",
      });
    }
  }

  /**
   * 🔄 Reset AI state (emergency fix for stuck state)
   */
  resetAIState() {
    this.logger.warn("🔄 Resetting AI state - clearing all active streams");

    // Clear all active streams
    for (const [messageId, abortController] of this.activeStreams) {
      try {
        abortController.abort();
        this.logger.info(`⏹️ Aborted stuck stream: ${messageId}`);
      } catch (error) {
        this.logger.error(`Error aborting stream ${messageId}:`, error);
      }
    }

    this.activeStreams.clear();
    this.isAIResponding = false;

    this.sendMessageToWebview({
      type: "info",
      message: "AI state reset successfully. You can now send new messages.",
    });

    this.logger.info("🔄 AI state reset completed");
  }

  /**
   * 📨 Send message to webview
   */
  sendMessageToWebview(message) {
    if (this.webviewView) {
      this.webviewView.webview.postMessage(message);
    }
  }

  /**
   * ❌ Send error message to webview
   */
  sendErrorToWebview(error) {
    // Handle both simple strings and enhanced error objects
    let errorData;
    if (typeof error === "string") {
      errorData = error;
    } else if (error.enhancedInfo) {
      errorData = error;
    } else {
      errorData = error.message || error.toString();
    }

    this.sendMessageToWebview({
      type: "error",
      message: errorData,
    });

    // Hide thinking indicator on error
    this.sendMessageToWebview({
      type: "aiThinking",
      thinking: false,
    });
  }

  /**
   * 🗑️ Clear chat history
   */
  async clearChatHistory() {
    this.chatHistory = [];
    await this.saveChatHistory();
    this.sendMessageToWebview({ type: "clearMessages" });
    this.logger.info("🦊 Chat history cleared");
  }

  /**
   * 🗑️ Delete a specific message
   */
  async handleDeleteMessage(messageId) {
    try {
      this.logger.info(`🗑️ Deleting message: ${messageId}`);

      // Find and remove the message from history
      const messageIndex = this.chatHistory.findIndex(
        (msg) => msg.id === messageId
      );
      if (messageIndex === -1) {
        throw new Error("Message not found");
      }

      const deletedMessage = this.chatHistory[messageIndex];
      this.chatHistory.splice(messageIndex, 1);

      // Save updated history
      await this.saveChatHistory();

      // Notify webview that message was deleted
      this.sendMessageToWebview({
        type: "messageDeleted",
        messageId: messageId,
      });

      this.logger.info(`🗑️ Message deleted successfully: ${messageId}`);
    } catch (error) {
      this.logger.error("Failed to delete message:", error);
      this.sendErrorToWebview(`Failed to delete message: ${error.message}`);
    }
  }

  /**
   * 🔄 Regenerate an assistant message
   */
  async handleRegenerateMessage(messageId) {
    try {
      this.logger.info(`🔄 Regenerating message: ${messageId}`);

      // Find the assistant message
      const messageIndex = this.chatHistory.findIndex(
        (msg) => msg.id === messageId
      );
      if (messageIndex === -1) {
        throw new Error("Message not found");
      }

      const assistantMessage = this.chatHistory[messageIndex];
      if (assistantMessage.type !== "assistant") {
        throw new Error("Can only regenerate assistant messages");
      }

      // Find the preceding user message
      let userMessageIndex = messageIndex - 1;
      while (
        userMessageIndex >= 0 &&
        this.chatHistory[userMessageIndex].type !== "user"
      ) {
        userMessageIndex--;
      }

      if (userMessageIndex < 0) {
        throw new Error("No user message found to regenerate from");
      }

      const userMessage = this.chatHistory[userMessageIndex];

      // Show thinking indicator
      this.sendMessageToWebview({
        type: "aiThinking",
        thinking: true,
      });

      // Get new AI response using NOX consciousness system
      const aiResponse = await this.agentController.executeTask("chat", {
        message: userMessage.content,
        maxTokens: 4000,
      });

      // Hide thinking indicator
      this.sendMessageToWebview({
        type: "aiThinking",
        thinking: false,
      });

      // Create new message object
      const newMessage = {
        id: (Date.now() + Math.random()).toString(),
        type: "assistant",
        content: aiResponse.content,
        timestamp: new Date().toISOString(),
        tokens: aiResponse.tokens || 0,
        cost: aiResponse.cost || 0,
        provider: aiResponse.provider || "unknown",
        model: aiResponse.model || "unknown",
      };

      // Replace old message with new one
      this.chatHistory[messageIndex] = newMessage;
      await this.saveChatHistory();

      // Notify webview that message was regenerated
      this.sendMessageToWebview({
        type: "messageRegenerated",
        oldMessageId: messageId,
        newMessage: newMessage,
      });

      this.logger.info(
        `🔄 Message regenerated successfully: ${messageId} -> ${newMessage.id}`
      );
    } catch (error) {
      this.logger.error("Failed to regenerate message:", error);

      // Hide thinking indicator on error
      this.sendMessageToWebview({
        type: "aiThinking",
        thinking: false,
      });

      this.sendErrorToWebview(`Failed to regenerate message: ${error.message}`);
    }
  }

  /**
   * 🔄 Handle provider change
   */
  async handleProviderChange(provider) {
    try {
      if (!this.agentController?.aiClient) {
        throw new Error("AI Client not available");
      }

      // Update current provider
      await this.agentController.aiClient.setCurrentProvider(provider);

      // Send updated provider info to webview
      await this.sendProviderStatus();

      this.logger.info(`🦊 Provider changed to: ${provider}`);
    } catch (error) {
      this.logger.error("Failed to change provider:", error);
      this.sendErrorToWebview(`Failed to change provider: ${error.message}`);
    }
  }

  /**
   * 🔄 Handle model change
   */
  async handleModelChange(model) {
    try {
      if (!this.agentController?.aiClient) {
        throw new Error("AI Client not available");
      }

      // Update current model (we'll need to add this method to aiClient)
      await this.agentController.aiClient.setCurrentModel(model);

      // Send updated provider info to webview
      await this.sendProviderStatus();

      this.logger.info(`🦊 Model changed to: ${model}`);
    } catch (error) {
      this.logger.error("Failed to change model:", error);
      this.sendErrorToWebview(`Failed to change model: ${error.message}`);
    }
  }

  /**
   * 📊 Send provider status to webview
   */
  async sendProviderStatus() {
    try {
      if (!this.agentController?.aiClient) {
        this.logger.warn("🦊 No aiClient available for provider status");
        return;
      }

      const currentProviderObj =
        this.agentController.aiClient.getCurrentProvider();

      if (!currentProviderObj || !currentProviderObj.id) {
        this.logger.error(
          "🦊 Invalid currentProvider object:",
          currentProviderObj
        );
        return;
      }

      const currentProvider = currentProviderObj.id; // Extract the ID string
      const providers = this.agentController.aiClient.getProviders();
      const currentModel = this.agentController.aiClient.getCurrentModel();

      // Get API key status for each provider
      const providerStatus = {};
      for (const [providerId, provider] of Object.entries(providers)) {
        const hasApiKey = await this.agentController.aiClient.getApiKey(
          providerId
        );
        providerStatus[providerId] = {
          ...provider,
          hasApiKey: !!hasApiKey,
          isActive: providerId === currentProvider,
        };
      }

      const messageData = {
        type: "providerStatus",
        currentProvider,
        currentModel,
        providers: providerStatus,
      };

      this.sendMessageToWebview(messageData);
    } catch (error) {
      this.logger.error("Failed to send provider status:", error);
    }
  }

  /**
   * 💾 Save chat history to workspace state
   */
  async saveChatHistory() {
    try {
      await this.context.workspaceState.update(
        "nox.chatHistory",
        this.chatHistory
      );
    } catch (error) {
      this.logger.error("Failed to save chat history:", error);
    }
  }

  /**
   * 📖 Load chat history from workspace state
   */
  async loadChatHistory() {
    try {
      const savedHistory = this.context.workspaceState.get(
        "nox.chatHistory",
        []
      );
      this.chatHistory = Array.isArray(savedHistory) ? savedHistory : [];

      if (this.chatHistory.length > 0) {
        this.sendMessageToWebview({
          type: "loadHistory",
          history: this.chatHistory,
        });
      }
    } catch (error) {
      this.logger.error("Failed to load chat history:", error);
      this.chatHistory = [];
    }
  }

  /**
   * 🚀 Handle webview ready event
   */
  async handleWebviewReady() {
    // Send current provider status (includes provider, model, and API key status)
    await this.sendProviderStatus();

    // Load chat history
    await this.loadChatHistory();

    // Apply current theme to chat sidebar
    await this.applyCurrentTheme();
  }

  /**
   * 🎨 Apply current theme to chat sidebar
   */
  async applyCurrentTheme() {
    try {
      console.log("🎨 [DEBUG] applyCurrentTheme called");
      console.log("🎨 [DEBUG] themeService available:", !!this.themeService);

      if (!this.themeService) {
        console.warn("🎨 Theme service not available for chat sidebar");
        this.logger.warn("🎨 Theme service not available for chat sidebar");
        return;
      }

      // Get current theme
      const currentTheme = this.themeService.getCurrentTheme();
      console.log(
        "🎨 [DEBUG] Current theme from service:",
        currentTheme?.name || "null"
      );

      if (!currentTheme) {
        console.warn("🎨 No current theme found, using default");
        this.logger.info("🎨 No current theme found, using default");
        return;
      }

      this.logger.info(
        `🎨 Applying theme to chat sidebar: ${currentTheme.name}`
      );

      // Generate CSS variables for the theme
      const cssVariables = this.themeService.generateCSSVariables(currentTheme);

      // Create CSS injection script for chat sidebar
      // This script applies theme variables with multiple layers of protection
      const cssInjectionScript = `
        (function() {
          const root = document.documentElement;
          const variables = ${JSON.stringify(cssVariables)};

          // Apply all CSS variables with !important to override bundled defaults
          Object.entries(variables).forEach(([property, value]) => {
            root.style.setProperty(property, value, 'important');
          });

          // Log theme application for debugging
          console.log('🎨 Chat sidebar theme applied:', '${currentTheme.name}');
          console.log('🎨 Variables:', variables);

          // Trigger Aurora animation refresh
          const auroraElements = document.querySelectorAll('.aurora-bg, .progress-fill');
          auroraElements.forEach(el => {
            el.style.animation = 'none';
            el.offsetHeight; // Trigger reflow
            el.style.animation = null;
          });
        })();
      `;

      // Send CSS injection to chat sidebar webview
      this.sendMessageToWebview({
        type: "injectCSS",
        script: cssInjectionScript,
        theme: {
          id: currentTheme.id,
          name: currentTheme.name,
          variables: cssVariables,
        },
      });

      this.logger.info(
        `🎨 Theme CSS variables sent to chat sidebar: ${currentTheme.name}`
      );

      // CRITICAL FIX: Apply theme again after a short delay to ensure bundled JS has loaded
      // This ensures the theme persists even if bundled CSS tries to override it
      setTimeout(() => {
        this.sendMessageToWebview({
          type: "injectCSS",
          script: cssInjectionScript,
          theme: {
            id: currentTheme.id,
            name: currentTheme.name,
            variables: cssVariables,
          },
        });
        this.logger.info(
          `🎨 Theme CSS variables re-applied after bundled JS load: ${currentTheme.name}`
        );
      }, 500);
    } catch (error) {
      this.logger.error("🎨 Failed to apply theme to chat sidebar:", error);
    }
  }

  /**
   * 🔧 Setup view-specific events
   */
  setupViewEvents() {
    // Handle view visibility changes
    this.webviewView.onDidChangeVisibility(() => {
      if (this.webviewView.visible) {
        this.logger.info("🦊 Nox chat sidebar became visible");

        // CRITICAL FIX: Re-apply theme when view becomes visible
        // This ensures theme persists even if it was overridden while hidden
        this.applyCurrentTheme();
      }
    });

    // Handle view disposal
    this.webviewView.onDidDispose(() => {
      this.dispose();
    });
  }

  /**
   * 🧹 Cleanup resources
   */
  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    this.webviewView = null;
    this.logger.info("🦊 Nox chat sidebar disposed");
  }

  /**
   * 🎨 Get webview HTML content (using bundled architecture)
   */
  getWebviewContent() {
    const nonce = this.getNonce();

    // Get the bundled webview resources
    const webviewUri = this.webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "out",
        "webview",
        "webview.js"
      )
    );

    const vendorsUri = this.webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "out",
        "webview",
        "vendors.js"
      )
    );

    // 🎨 Get current theme CSS variables for initial load
    let themeCSS = "";
    let themeInitScript = "";
    try {
      if (this.themeService) {
        const currentTheme = this.themeService.getCurrentTheme();
        if (currentTheme) {
          const cssVariables =
            this.themeService.generateCSSVariables(currentTheme);

          // Create inline style tag with !important to override bundled defaults
          themeCSS = `
        <style nonce="${nonce}">
          :root {
            ${Object.entries(cssVariables)
              .map(([key, value]) => `${key}: ${value} !important;`)
              .join("\n            ")}
          }
        </style>
          `;

          // Also create a script that applies theme immediately after DOM loads
          // This ensures theme is applied even if bundled CSS tries to override
          // CRITICAL FIX: Apply theme multiple times to ensure it persists
          themeInitScript = `
        <script nonce="${nonce}">
          (function() {
            const themeVariables = ${JSON.stringify(cssVariables)};
            const root = document.documentElement;

            // Function to apply theme variables
            function applyTheme() {
              Object.entries(themeVariables).forEach(([property, value]) => {
                root.style.setProperty(property, value, 'important');
              });
            }

            // Apply theme immediately
            applyTheme();
            console.log('🎨 [INIT] Theme applied on page load: ${
              currentTheme.name
            }');

            // Re-apply theme after DOM is fully ready
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', () => {
                applyTheme();
                console.log('🎨 [INIT] Theme re-applied after DOMContentLoaded: ${
                  currentTheme.name
                }');
              });
            }

            // Re-apply theme after a short delay to ensure bundled CSS has loaded
            setTimeout(() => {
              applyTheme();
              console.log('🎨 [INIT] Theme re-applied after bundled JS load: ${
                currentTheme.name
              }');
            }, 100);

            // Re-apply theme after window load
            window.addEventListener('load', () => {
              applyTheme();
              console.log('🎨 [INIT] Theme re-applied after window load: ${
                currentTheme.name
              }');
            });
          })();
        </script>
          `;

          this.logger.info(
            `🎨 Embedded theme CSS for initial load: ${currentTheme.name}`
          );
        }
      }
    } catch (error) {
      this.logger.warn("🎨 Failed to embed theme CSS in initial HTML:", error);
    }

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}' ${
      this.webviewView.webview.cspSource
    } 'unsafe-eval'; font-src https:; media-src * data: blob:;">
        <meta http-equiv="Permissions-Policy" content="microphone=*, camera=*, geolocation=*">
        <title>🦊 Nox Chat</title>
        <!-- Bundled styles will be injected here by webpack style-loader -->
    </head>
    <body>
        <div class="aurora-bg"></div>
        <div class="chat-container">



            <!-- Provider & Model Selection (Collapsible) -->
            <div class="provider-controls" id="providerControls">
                <div class="provider-selector">
                    <label for="providerSelect">🤖 Provider:</label>
                    <select id="providerSelect" class="provider-dropdown">
                        <!-- Options will be populated dynamically by bundled JavaScript -->
                    </select>
                    <div class="provider-status" id="providerStatus">
                        <span class="status-indicator" id="statusIndicator">●</span>
                        <span class="status-text" id="statusText">Loading...</span>
                    </div>
                </div>

                <div class="model-selector">
                    <label for="modelSelect">🧠 Model:</label>
                    <select id="modelSelect" class="model-dropdown">
                        <!-- Options will be populated dynamically by bundled JavaScript -->
                    </select>
                </div>

                <div class="cost-tracker" id="costTracker">
                    <div class="cost-info">
                        <span class="cost-label">Session:</span>
                        <span class="cost-value" id="sessionCost">$0.00</span>
                    </div>
                    <div class="token-info">
                        <span class="token-label">Tokens:</span>
                        <span class="token-value" id="sessionTokens">0</span>
                    </div>
                </div>
            </div>

            <!-- Messages Container -->
            <div class="messages-container" id="messagesContainer">
                <div class="welcome-message">
                    <div class="fox-welcome">🦊</div>
                    <div class="welcome-text">
                        <h3>Welcome to Nox!</h3>
                        <p>Your clever AI coding fox is ready to help.</p>
                        <div class="bundled-indicator">✨ Enterprise Bundle</div>
                    </div>
                </div>
            </div>

            <!-- Streaming Toggle -->
            <div class="streaming-toggle-container">
                <label class="streaming-toggle">
                    <input type="checkbox" id="streamingToggle" checked>
                    <span class="toggle-slider"></span>
                    <span class="toggle-label">🌊 Real-time Streaming</span>
                </label>
            </div>

            <!-- Input Area -->
            <div class="input-container">
                <div class="input-wrapper">
                    <div class="input-field-container">
                        <textarea id="messageInput" class="message-input" placeholder="Ask Nox anything about your code..." rows="1"></textarea>

                        <!-- Voice Recording Animation (inside input field) -->
                        <div id="voiceRecordingAnimation" class="voice-recording-animation" style="display: none;">
                            <div class="pulse-dot"></div>
                            <div class="pulse-dot"></div>
                            <div class="pulse-dot"></div>
                        </div>

                        <button id="micBtn" class="mic-button-inline" title="Voice input (click to start/stop recording)">
                            <!-- Microphone Icon -->
                            <svg class="mic-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                            </svg>
                            <!-- Stop Icon (hidden by default) -->
                            <svg class="stop-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                                <rect x="6" y="6" width="12" height="12"></rect>
                            </svg>
                        </button>
                    </div>
                    <button id="sendBtn" class="send-button" title="Send message">
                        <span class="send-icon">🚀</span>
                    </button>
                </div>


                <!-- Voice Error Display -->
                <div id="voiceError" class="voice-error-message" style="display: none;">
                    <div class="error-content">
                        <svg class="error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <span class="error-text"></span>
                        <button class="error-action" style="display: none;">Enable Microphone</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Load bundled JavaScript -->
        <script nonce="${nonce}" src="${vendorsUri}"></script>
        <script nonce="${nonce}" src="${webviewUri}"></script>

        <!-- Apply theme CSS AFTER bundled styles are injected (ensures theme overrides defaults) -->
        ${themeCSS}

        <!-- Apply theme variables via JavaScript (double-layer protection) -->
        ${themeInitScript}

        <!-- 🔴 PHASE 3: NOX Modal System (Scalable Modal Management) -->
        <script nonce="${nonce}">
${this.getModalSystemScript()}
        </script>
    </body>
    </html>`;
  }

  /**
   * 🗑️ Clear chat history
   */
  clearChatHistory() {
    try {
      this.chatHistory = [];
      this.saveChatHistory()
        .then(() => {
          // Notify webview that chat was cleared
          this.sendMessageToWebview({
            type: "clearMessages",
          });
          this.logger.info("🗑️ Chat history cleared");
        })
        .catch((error) => {
          this.logger.error("Failed to clear chat history:", error);
          this.sendErrorToWebview(
            "Failed to clear chat history: " + error.message
          );
        });
    } catch (error) {
      this.logger.error("Failed to clear chat history:", error);
      this.sendErrorToWebview("Failed to clear chat history: " + error.message);
    }
  }

  /**
   * 🔴 PHASE 3: Get modal system script (embedded in webview)
   */
  getModalSystemScript() {
    // Read the modal system file and embed it
    const fs = require("fs");
    const path = require("path");
    try {
      const modalSystemPath = path.join(__dirname, "noxModalSystem.js");
      const modalSystemCode = fs.readFileSync(modalSystemPath, "utf8");
      return modalSystemCode;
    } catch (error) {
      this.logger.warn("Failed to load modal system script:", error);
      return "console.warn('Modal system not available');";
    }
  }

  /**
   * 🎨 Generate a nonce for CSP
   */
  getNonce() {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * 🎨 CSS is now bundled with webpack - this method is deprecated
   */
  getWebviewCSS() {
    // All CSS is now handled by bundled stylesheets
    return "";
  }

  /**
   * JavaScript functionality is now handled by bundled webview
   */
  getWebviewJS() {
    return "";
  }

  /**
   * 🔄 Update toggle button icon based on collapsed state
   */
  async updateToggleButtonIcon(collapsed) {
    try {
      // Update the command icon in package.json dynamically
      const newIcon = collapsed ? "$(chevron-right)" : "$(chevron-down)";

      // We can't dynamically update package.json commands, but we can log the state
      this.logger.info(
        `🦊 Provider section ${
          collapsed ? "collapsed" : "expanded"
        } - icon should be ${newIcon}`
      );

      // Note: VS Code doesn't support dynamic command icon updates
      // The icon animation would need to be handled in CSS within the webview
    } catch (error) {
      this.logger.error("Error updating toggle button icon:", error);
    }
  }

  /**
   * 🎤 Start voice recording via extension backend
   */
  async startVoiceRecording() {
    try {
      this.logger.info("🎤 Starting voice recording...");

      // Check voice settings first
      const status = this.voiceRecordingService.getRecordingStatus();

      if (!status.voiceEnabled) {
        // Voice is disabled in settings
        this.webviewView.webview.postMessage({
          type: "showVoiceError",
          message: "Voice input is disabled. Enable it in Nox Settings.",
          showSettingsButton: true,
        });
        return;
      }

      // Show inline recording indicator in webview
      this.webviewView.webview.postMessage({
        type: "showInlineRecording",
        recording: true,
      });

      // Start actual voice recording
      const result = await this.voiceRecordingService.startRecording();

      if (!result.success) {
        throw new Error(result.error);
      }

      this.logger.info("🎤 Voice recording started successfully");
    } catch (error) {
      this.logger.error("🎤 Voice recording failed:", error);

      // Show error and hide inline recording
      this.webviewView.webview.postMessage({
        type: "hideInlineRecording",
      });

      // Show error message
      vscode.window.showErrorMessage(
        `🎤 Voice recording failed: ${error.message}`
      );
    }
  }

  /**
   * 🎤 Stop voice recording
   */
  async stopVoiceRecording() {
    try {
      this.logger.info("🎤 Stopping voice recording...");

      // Stop recording and get transcription
      const result = await this.voiceRecordingService.stopRecording();

      // Hide inline recording indicator
      this.webviewView.webview.postMessage({
        type: "hideInlineRecording",
      });

      if (result.success && result.text) {
        // Insert transcribed text into input field
        this.webviewView.webview.postMessage({
          type: "insertVoiceText",
          text: result.text,
        });

        this.logger.info(`🎤 Voice transcription completed: "${result.text}"`);
      } else {
        throw new Error(result.error || "Transcription failed");
      }
    } catch (error) {
      this.logger.error("🎤 Stop recording failed:", error);

      // Hide inline recording indicator
      this.webviewView.webview.postMessage({
        type: "hideInlineRecording",
      });

      // Show error message
      vscode.window.showErrorMessage(
        `🎤 Voice transcription failed: ${error.message}`
      );
    }
  }

  /**
   * 🎤 Send current voice status to webview
   */
  async sendVoiceStatus() {
    try {
      const status = this.voiceRecordingService.getRecordingStatus();

      // Send voice status to webview
      this.webviewView.webview.postMessage({
        type: "voiceStatus",
        status: {
          enabled: status.voiceEnabled,
          engine: status.currentEngine,
          engines: {
            free: true, // Vosk is always available
            openai: status.openaiAvailable,
            google: status.googleAvailable,
          },
        },
      });

      this.logger.info("🎤 Voice status sent to webview");
    } catch (error) {
      this.logger.error("🎤 Failed to send voice status:", error);
    }
  }

  /**
   * 🔴 PHASE 3: Execute capabilities from AI response
   */
  async executeCapabilitiesFromResponse(capabilities) {
    try {
      if (!capabilities) return;

      // Execute capabilities that require approval
      if (
        capabilities.requiresApproval &&
        capabilities.requiresApproval.length > 0
      ) {
        for (const capability of capabilities.requiresApproval) {
          try {
            this.logger.info(
              `🔐 Requesting approval for: ${capability.description}`
            );

            // Execute capability (which will handle approval internally)
            const result = await this.agentController.executeCapability(
              capability
            );

            if (result.success) {
              this.logger.info(
                `✅ Capability executed: ${capability.description}`
              );
              this.sendMessageToWebview({
                type: "capabilityExecuted",
                capability: capability.type,
                message: result.message,
                success: true,
              });
            } else {
              this.logger.warn(`⚠️ Capability failed: ${result.message}`);
              this.sendMessageToWebview({
                type: "capabilityExecuted",
                capability: capability.type,
                message: result.message,
                success: false,
              });
            }
          } catch (error) {
            this.logger.error(`Failed to execute capability: ${error.message}`);
          }
        }
      }

      // Execute auto-executable capabilities
      if (capabilities.executed && capabilities.executed.length > 0) {
        for (const capability of capabilities.executed) {
          try {
            this.logger.info(`⚡ Auto-executing: ${capability.description}`);
            const result = await this.agentController.executeCapability(
              capability
            );

            if (result.success) {
              this.logger.info(`✅ Auto-executed: ${capability.description}`);
            }
          } catch (error) {
            this.logger.error(
              `Failed to auto-execute capability: ${error.message}`
            );
          }
        }
      }
    } catch (error) {
      this.logger.error("Failed to execute capabilities from response:", error);
    }
  }
}

module.exports = NoxChatViewProvider;
