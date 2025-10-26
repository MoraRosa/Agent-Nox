export = AgentController;
/**
 * Main Agent Controller - orchestrates all agent operations with enterprise-grade architecture
 */
declare class AgentController {
    constructor(context: any, logger: any, performanceMonitor: any);
    context: any;
    logger: any;
    performanceMonitor: any;
    aiClient: import("./aiClient") | null;
    contextManager: import("./contextManager") | null;
    fileOps: import("./fileOps") | null;
    indexEngine: import("./indexEngine") | null;
    cacheManager: import("../storage/cacheManager") | null;
    capabilityExecutor: import("./capabilityExecutor") | null;
    noxSystemPrompt: NoxSystemPrompt | null;
    noxCapabilities: NoxCapabilities | null;
    noxContextBuilder: NoxContextBuilder | null;
    isInitialized: boolean;
    workspacePath: string | null;
    configuration: vscode.WorkspaceConfiguration | null;
    /**
     * Initialize the agent controller and all core components
     */
    initialize(): Promise<void>;
    /**
     * Load and validate configuration
     */
    loadConfiguration(): Promise<void>;
    configValues: {
        aiProvider: string;
        enableCaching: boolean;
        enableTelemetry: boolean;
        maxContextSize: number;
        logLevel: string;
    } | {
        aiProvider: string;
        enableCaching: boolean;
        enableTelemetry: boolean;
        maxContextSize: number;
        logLevel: string;
    } | undefined;
    /**
     * Get configuration value with fallback
     */
    get(key: any, defaultValue?: null): any;
    /**
     * Initialize workspace context
     */
    initializeWorkspace(): Promise<void>;
    /**
     * Initialize core components with dependency injection
     */
    initializeCoreComponents(): Promise<void>;
    /**
     * Validate that all components are properly initialized
     */
    validateInitialization(): Promise<void>;
    /**
     * Handle workspace folder changes
     */
    handleWorkspaceChange(_event: any): Promise<void>;
    /**
     * Handle file changes for intelligent indexing
     */
    handleFileChange(document: any): Promise<void>;
    /**
     * Update configuration when settings change
     */
    updateConfiguration(): Promise<void>;
    /**
     * Get agent status and health information
     */
    getStatus(): {
        initialized: boolean;
        workspace: string | null;
        components: {
            aiClient: boolean;
            contextManager: boolean;
            fileOps: boolean;
            indexEngine: boolean;
            cacheManager: boolean;
            capabilityExecutor: boolean;
            noxSystemPrompt: boolean;
            noxCapabilities: boolean;
            noxContextBuilder: boolean;
        };
        noxConsciousness: {
            enabled: boolean;
            sessionId: string | null;
            chatHistoryLength: number;
            capabilityStats: {
                total: number;
                enabled: number;
                disabled: number;
                requiresApproval: number;
                categories: number;
            } | null;
        };
        performance: any;
        costs: any;
    };
    /**
     * 🦊 Execute NOX task with full AI consciousness and capabilities
     */
    executeTask(taskType: any, parameters?: {}): Promise<{
        taskType: any;
        parameters: any;
        status: string;
        timestamp: number;
        content: any;
        provider: any;
        model: any;
        tokens: any;
        cost: any;
        noxContext: {
            sessionId: any;
            contextBuildTime: any;
            relevanceScore: any;
        };
        capabilities: {
            executed: never[];
            suggested: never[];
            requiresApproval: never[];
        };
    } | {
        taskType: any;
        parameters: any;
        status: string;
        timestamp: number;
        content: any;
        provider: any;
        model: any;
        tokens: any;
        cost: any;
        error: any;
        noxContext: {
            sessionId: any;
            contextBuildTime: any;
            relevanceScore: any;
        };
    }>;
    /**
     * 🧠 Build comprehensive NOX context
     */
    buildNoxContext(taskType: any, parameters: any): Promise<{
        chatHistory: any[];
        contextBuildTime: number;
        vscodeVersion: string;
        platform: NodeJS.Platform;
        nodeVersion: string;
        workspaceCount: number;
        extensionHost: string;
        language: string;
        hasGit: boolean;
        gitPath?: undefined;
        relevantFiles: never[];
        relevantSymbols: never[];
        relevanceScore: number;
        searchQuery?: undefined;
        activeFile: null;
        activeLanguage: null;
        selectedText: null;
        cursorPosition: null;
        fileContent: null;
        projectStructure: any;
        workspacePath: null;
        workspaceName: null;
        hasWorkspace: boolean;
        totalFiles: number;
        totalSymbols?: undefined;
        sessionId: string;
        sessionStartTime: number;
        timestamp: number;
        taskType: any;
    } | {
        chatHistory: any[];
        contextBuildTime: number;
        vscodeVersion?: undefined;
        platform?: undefined;
        nodeVersion?: undefined;
        workspaceCount?: undefined;
        extensionHost?: undefined;
        language?: undefined;
        hasGit: boolean;
        gitPath?: undefined;
        relevantFiles: never[];
        relevantSymbols: never[];
        relevanceScore: number;
        searchQuery?: undefined;
        activeFile: null;
        activeLanguage: null;
        selectedText: null;
        cursorPosition: null;
        fileContent: null;
        projectStructure: any;
        workspacePath: null;
        workspaceName: null;
        hasWorkspace: boolean;
        totalFiles: number;
        totalSymbols?: undefined;
        sessionId: string;
        sessionStartTime: number;
        timestamp: number;
        taskType: any;
    } | {
        chatHistory: any[];
        contextBuildTime: number;
        vscodeVersion: string;
        platform: NodeJS.Platform;
        nodeVersion: string;
        workspaceCount: number;
        extensionHost: string;
        language: string;
        hasGit: boolean;
        gitPath: string;
        relevantFiles: never[];
        relevantSymbols: never[];
        relevanceScore: number;
        searchQuery?: undefined;
        activeFile: null;
        activeLanguage: null;
        selectedText: null;
        cursorPosition: null;
        fileContent: null;
        projectStructure: any;
        workspacePath: null;
        workspaceName: null;
        hasWorkspace: boolean;
        totalFiles: number;
        totalSymbols?: undefined;
        sessionId: string;
        sessionStartTime: number;
        timestamp: number;
        taskType: any;
    } | {
        chatHistory: any[];
        contextBuildTime: number;
        vscodeVersion?: undefined;
        platform?: undefined;
        nodeVersion?: undefined;
        workspaceCount?: undefined;
        extensionHost?: undefined;
        language?: undefined;
        hasGit: boolean;
        gitPath: string;
        relevantFiles: never[];
        relevantSymbols: never[];
        relevanceScore: number;
        searchQuery?: undefined;
        activeFile: null;
        activeLanguage: null;
        selectedText: null;
        cursorPosition: null;
        fileContent: null;
        projectStructure: any;
        workspacePath: null;
        workspaceName: null;
        hasWorkspace: boolean;
        totalFiles: number;
        totalSymbols?: undefined;
        sessionId: string;
        sessionStartTime: number;
        timestamp: number;
        taskType: any;
    } | {
        chatHistory: any[];
        contextBuildTime: number;
        vscodeVersion: string;
        platform: NodeJS.Platform;
        nodeVersion: string;
        workspaceCount: number;
        extensionHost: string;
        language: string;
        hasGit: boolean;
        gitPath?: undefined;
        relevantFiles: any;
        relevantSymbols: any;
        relevanceScore: any;
        searchQuery: string;
        activeFile: null;
        activeLanguage: null;
        selectedText: null;
        cursorPosition: null;
        fileContent: null;
        projectStructure: any;
        workspacePath: null;
        workspaceName: null;
        hasWorkspace: boolean;
        totalFiles: number;
        totalSymbols?: undefined;
        sessionId: string;
        sessionStartTime: number;
        timestamp: number;
        taskType: any;
    } | {
        chatHistory: any[];
        contextBuildTime: number;
        vscodeVersion?: undefined;
        platform?: undefined;
        nodeVersion?: undefined;
        workspaceCount?: undefined;
        extensionHost?: undefined;
        language?: undefined;
        hasGit: boolean;
        gitPath?: undefined;
        relevantFiles: any;
        relevantSymbols: any;
        relevanceScore: any;
        searchQuery: string;
        activeFile: null;
        activeLanguage: null;
        selectedText: null;
        cursorPosition: null;
        fileContent: null;
        projectStructure: any;
        workspacePath: null;
        workspaceName: null;
        hasWorkspace: boolean;
        totalFiles: number;
        totalSymbols?: undefined;
        sessionId: string;
        sessionStartTime: number;
        timestamp: number;
        taskType: any;
    } | {
        chatHistory: any[];
        contextBuildTime: number;
        vscodeVersion: string;
        platform: NodeJS.Platform;
        nodeVersion: string;
        workspaceCount: number;
        extensionHost: string;
        language: string;
        hasGit: boolean;
        gitPath: string;
        relevantFiles: any;
        relevantSymbols: any;
        relevanceScore: any;
        searchQuery: string;
        activeFile: null;
        activeLanguage: null;
        selectedText: null;
        cursorPosition: null;
        fileContent: null;
        projectStructure: any;
        workspacePath: null;
        workspaceName: null;
        hasWorkspace: boolean;
        totalFiles: number;
        totalSymbols?: undefined;
        sessionId: string;
        sessionStartTime: number;
        timestamp: number;
        taskType: any;
    } | {
        chatHistory: any[];
        contextBuildTime: number;
        vscodeVersion?: undefined;
        platform?: undefined;
        nodeVersion?: undefined;
        workspaceCount?: undefined;
        extensionHost?: undefined;
        language?: undefined;
        hasGit: boolean;
        gitPath: string;
        relevantFiles: any;
        relevantSymbols: any;
        relevanceScore: any;
        searchQuery: string;
        activeFile: null;
        activeLanguage: null;
        selectedText: null;
        cursorPosition: null;
        fileContent: null;
        projectStructure: any;
        workspacePath: null;
        workspaceName: null;
        hasWorkspace: boolean;
        totalFiles: number;
        totalSymbols?: undefined;
        sessionId: string;
        sessionStartTime: number;
        timestamp: number;
        taskType: any;
    } | {
        chatHistory: any[];
        contextBuildTime: number;
        vscodeVersion: string;
        platform: NodeJS.Platform;
        nodeVersion: string;
        workspaceCount: number;
        extensionHost: string;
        language: string;
        hasGit: boolean;
        gitPath?: undefined;
        relevantFiles: never[];
        relevantSymbols: never[];
        relevanceScore: number;
        searchQuery?: undefined;
        activeFile: null;
        activeLanguage: null;
        selectedText: null;
        cursorPosition: null;
        fileContent: null;
        projectStructure: any;
        workspacePath: string;
        workspaceName: string;
        hasWorkspace: boolean;
        totalFiles: any;
        totalSymbols: any;
        sessionId: string;
        sessionStartTime: number;
        timestamp: number;
        taskType: any;
    } | {
        chatHistory: any[];
        contextBuildTime: number;
        vscodeVersion?: undefined;
        platform?: undefined;
        nodeVersion?: undefined;
        workspaceCount?: undefined;
        extensionHost?: undefined;
        language?: undefined;
        hasGit: boolean;
        gitPath?: undefined;
        relevantFiles: never[];
        relevantSymbols: never[];
        relevanceScore: number;
        searchQuery?: undefined;
        activeFile: null;
        activeLanguage: null;
        selectedText: null;
        cursorPosition: null;
        fileContent: null;
        projectStructure: any;
        workspacePath: string;
        workspaceName: string;
        hasWorkspace: boolean;
        totalFiles: any;
        totalSymbols: any;
        sessionId: string;
        sessionStartTime: number;
        timestamp: number;
        taskType: any;
    } | {
        chatHistory: any[];
        contextBuildTime: number;
        vscodeVersion: string;
        platform: NodeJS.Platform;
        nodeVersion: string;
        workspaceCount: number;
        extensionHost: string;
        language: string;
        hasGit: boolean;
        gitPath: string;
        relevantFiles: never[];
        relevantSymbols: never[];
        relevanceScore: number;
        searchQuery?: undefined;
        activeFile: null;
        activeLanguage: null;
        selectedText: null;
        cursorPosition: null;
        fileContent: null;
        projectStructure: any;
        workspacePath: string;
        workspaceName: string;
        hasWorkspace: boolean;
        totalFiles: any;
        totalSymbols: any;
        sessionId: string;
        sessionStartTime: number;
        timestamp: number;
        taskType: any;
    } | {
        chatHistory: any[];
        contextBuildTime: number;
        vscodeVersion?: undefined;
        platform?: undefined;
        nodeVersion?: undefined;
        workspaceCount?: undefined;
        extensionHost?: undefined;
        language?: undefined;
        hasGit: boolean;
        gitPath: string;
        relevantFiles: never[];
        relevantSymbols: never[];
        relevanceScore: number;
        searchQuery?: undefined;
        activeFile: null;
        activeLanguage: null;
        selectedText: null;
        cursorPosition: null;
        fileContent: null;
        projectStructure: any;
        workspacePath: string;
        workspaceName: string;
        hasWorkspace: boolean;
        totalFiles: any;
        totalSymbols: any;
        sessionId: string;
        sessionStartTime: number;
        timestamp: number;
        taskType: any;
    } | {
        chatHistory: any[];
        contextBuildTime: number;
        vscodeVersion: string;
        platform: NodeJS.Platform;
        nodeVersion: string;
        workspaceCount: number;
        extensionHost: string;
        language: string;
        hasGit: boolean;
        gitPath?: undefined;
        relevantFiles: any;
        relevantSymbols: any;
        relevanceScore: any;
        searchQuery: string;
        activeFile: null;
        activeLanguage: null;
        selectedText: null;
        cursorPosition: null;
        fileContent: null;
        projectStructure: any;
        workspacePath: string;
        workspaceName: string;
        hasWorkspace: boolean;
        totalFiles: any;
        totalSymbols: any;
        sessionId: string;
        sessionStartTime: number;
        timestamp: number;
        taskType: any;
    } | {
        chatHistory: any[];
        contextBuildTime: number;
        vscodeVersion?: undefined;
        platform?: undefined;
        nodeVersion?: undefined;
        workspaceCount?: undefined;
        extensionHost?: undefined;
        language?: undefined;
        hasGit: boolean;
        gitPath?: undefined;
        relevantFiles: any;
        relevantSymbols: any;
        relevanceScore: any;
        searchQuery: string;
        activeFile: null;
        activeLanguage: null;
        selectedText: null;
        cursorPosition: null;
        fileContent: null;
        projectStructure: any;
        workspacePath: string;
        workspaceName: string;
        hasWorkspace: boolean;
        totalFiles: any;
        totalSymbols: any;
        sessionId: string;
        sessionStartTime: number;
        timestamp: number;
        taskType: any;
    } | {
        chatHistory: any[];
        contextBuildTime: number;
        vscodeVersion: string;
        platform: NodeJS.Platform;
        nodeVersion: string;
        workspaceCount: number;
        extensionHost: string;
        language: string;
        hasGit: boolean;
        gitPath: string;
        relevantFiles: any;
        relevantSymbols: any;
        relevanceScore: any;
        searchQuery: string;
        activeFile: null;
        activeLanguage: null;
        selectedText: null;
        cursorPosition: null;
        fileContent: null;
        projectStructure: any;
        workspacePath: string;
        workspaceName: string;
        hasWorkspace: boolean;
        totalFiles: any;
        totalSymbols: any;
        sessionId: string;
        sessionStartTime: number;
        timestamp: number;
        taskType: any;
    } | {
        chatHistory: any[];
        contextBuildTime: number;
        vscodeVersion?: undefined;
        platform?: undefined;
        nodeVersion?: undefined;
        workspaceCount?: undefined;
        extensionHost?: undefined;
        language?: undefined;
        hasGit: boolean;
        gitPath: string;
        relevantFiles: any;
        relevantSymbols: any;
        relevanceScore: any;
        searchQuery: string;
        activeFile: null;
        activeLanguage: null;
        selectedText: null;
        cursorPosition: null;
        fileContent: null;
        projectStructure: any;
        workspacePath: string;
        workspaceName: string;
        hasWorkspace: boolean;
        totalFiles: any;
        totalSymbols: any;
        sessionId: string;
        sessionStartTime: number;
        timestamp: number;
        taskType: any;
    }>;
    /**
     * 🦊 Build NOX system prompt with full consciousness
     */
    buildNoxSystemPrompt(taskType: any, noxContext: any): string;
    /**
     * 🎯 Build task-specific NOX prompt
     */
    buildNoxTaskPrompt(taskType: any, parameters: any, noxContext: any): string;
    /**
     * 🤖 Execute NOX task with AI consciousness
     */
    executeNoxTask(systemPrompt: any, taskPrompt: any, parameters: any): Promise<{
        id: string;
        type: string;
        content: any;
        provider: string;
        model: any;
        tokens: any;
        cost: number;
        timestamp: string;
    }>;
    /**
     * 🌊 Execute NOX streaming task with AI consciousness
     */
    executeNoxStreamingTask(systemPrompt: any, taskPrompt: any, parameters: any, onChunk: any, onComplete: any, abortController: any): Promise<void>;
    /**
     * 🔄 Process NOX result and execute capabilities
     */
    processNoxResult(taskType: any, aiResponse: any, parameters: any, noxContext: any): Promise<{
        taskType: any;
        parameters: any;
        status: string;
        timestamp: number;
        content: any;
        provider: any;
        model: any;
        tokens: any;
        cost: any;
        noxContext: {
            sessionId: any;
            contextBuildTime: any;
            relevanceScore: any;
        };
        capabilities: {
            executed: never[];
            suggested: never[];
            requiresApproval: never[];
        };
    } | {
        taskType: any;
        parameters: any;
        status: string;
        timestamp: number;
        content: any;
        provider: any;
        model: any;
        tokens: any;
        cost: any;
        error: any;
        noxContext: {
            sessionId: any;
            contextBuildTime: any;
            relevanceScore: any;
        };
    }>;
    /**
     * 🚀 Execute task-specific capabilities
     */
    executeTaskCapabilities(taskType: any, aiResponse: any, parameters: any, noxContext: any, result: any): Promise<void>;
    /**
     * 💡 Execute explain task capabilities
     */
    executeExplainCapabilities(aiResponse: any, parameters: any, noxContext: any, result: any): Promise<void>;
    /**
     * 🔧 Execute refactor task capabilities
     */
    executeRefactorCapabilities(aiResponse: any, parameters: any, noxContext: any, result: any): Promise<void>;
    /**
     * 📊 Execute analyze task capabilities
     */
    executeAnalyzeCapabilities(aiResponse: any, parameters: any, noxContext: any, result: any): Promise<void>;
    /**
     * 🚀 Execute generate task capabilities
     */
    executeGenerateCapabilities(aiResponse: any, parameters: any, noxContext: any, result: any): Promise<void>;
    /**
     * 💬 Execute chat task capabilities
     */
    executeChatCapabilities(aiResponse: any, parameters: any, noxContext: any, result: any): Promise<void>;
    /**
     * 💬 Add message to chat history
     */
    addToChatHistory(role: any, content: any, context: any): void;
    /**
     * 🔍 Parse capability suggestions from AI response
     */
    parseCapabilitySuggestions(content: any, result: any): Promise<void>;
    /**
     * 🔤 Extract keywords from text for context search
     */
    extractKeywords(text: any): string;
    /**
     * 📄 Extract code blocks from AI response
     */
    extractCodeBlocks(content: any): {
        language: string;
        code: string;
    }[];
    /**
     * 📁 Suggest file name for generated code
     */
    suggestFileName(codeBlock: any, parameters: any): string | null;
    /**
     * 🧪 Detect test files in project
     */
    detectTestFiles(noxContext: any): any;
    /**
     * 🔍 Detect file operations from user message and AI response
     */
    detectFileOperations(userMessage: any, aiResponse: any): {
        type: string;
        description: string;
        action: string;
        parameters: {
            fileName: string;
            content: string;
        };
        risk: string;
    }[];
    /**
     * 🔍 Detect Git operations from user message and AI response
     */
    detectGitOperations(userMessage: any, aiResponse: any): ({
        type: string;
        description: string;
        parameters: {
            autoStage: boolean;
            branchName?: undefined;
        };
        autoExecute: boolean;
        risk: string;
    } | {
        type: string;
        description: string;
        parameters: {
            branchName: string;
            autoStage?: undefined;
        } | {
            autoStage?: undefined;
            branchName?: undefined;
        };
        autoExecute: boolean;
        risk: string;
    })[];
    /**
     * 🎯 Parse action items from chat response
     */
    parseActionItems(content: any): {
        type: string;
        description: string;
        action: string;
    }[];
    /**
     * 📄 Extract file mentions from text
     */
    extractFileMentions(text: any): string[];
    /**
     * 📄 Extract file content from AI response
     */
    extractFileContent(aiResponse: any, fileName: any): string;
    /**
     * 📄 Generate basic file template
     */
    generateBasicFileTemplate(fileName: any): string;
    /**
     * 🚀 Execute capability from result
     */
    executeCapability(capability: any, context?: {}): Promise<{
        success: boolean;
        type: string;
        result: any;
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        type: string;
        error: any;
        message: string;
        result?: undefined;
    } | {
        success: boolean;
        type: any;
        message: string;
        suggestion: string;
    } | {
        success: boolean;
        reason: string;
        error: any;
        capabilityId: string;
        executionTime: any;
    } | {
        success: boolean;
        reason: string;
        capabilityId: string;
        message: string;
        autonomyLevel: string;
    }>;
    /**
     * 📊 Get capability execution statistics
     */
    getCapabilityStats(): {
        totalExecutions: number;
        successful: number;
        failed: number;
        successRate: number;
        pendingApprovals: number;
        recentExecutions: any[];
    } | {
        error: string;
    };
    /**
     * 📝 Build user message for chat history
     */
    buildUserMessage(taskType: any, parameters: any): any;
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
}
import NoxSystemPrompt = require("./noxSystemPrompt");
import NoxCapabilities = require("./noxCapabilities");
import NoxContextBuilder = require("./noxContextBuilder");
import vscode = require("vscode");
//# sourceMappingURL=agentController.d.ts.map