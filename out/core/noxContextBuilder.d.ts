export = NoxContextBuilder;
/**
 * 🦊 NOX Context Builder - Gathers comprehensive project context for AI consciousness
 * Provides full project visibility and intelligent context assembly
 */
declare class NoxContextBuilder {
    constructor(contextManager: any, indexEngine: any, logger: any, performanceMonitor: any);
    contextManager: any;
    indexEngine: any;
    logger: any;
    performanceMonitor: any;
    chatHistory: any[];
    maxChatHistory: number;
    sessionId: string;
    sessionStartTime: number;
    /**
     * 🧠 Build comprehensive NOX context for AI consciousness
     */
    buildNoxContext(taskType: any, parameters?: {}): Promise<{
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
     * 🏠 Get workspace context
     */
    getWorkspaceContext(): Promise<{
        workspacePath: null;
        workspaceName: null;
        hasWorkspace: boolean;
        totalFiles: number;
        totalSymbols?: undefined;
    } | {
        workspacePath: string;
        workspaceName: string;
        hasWorkspace: boolean;
        totalFiles: any;
        totalSymbols: any;
    }>;
    /**
     * 📁 Get project structure
     */
    getProjectStructure(): Promise<any>;
    /**
     * 🔍 Scan project structure recursively
     */
    scanProjectStructure(dirPath: any, maxDepth: any, currentDepth?: number): any;
    /**
     * 📄 Get active file context
     */
    getActiveFileContext(parameters: any): Promise<{
        activeFile: null;
        activeLanguage: null;
        selectedText: null;
        cursorPosition: null;
        fileContent: null;
    }>;
    /**
     * 🎯 Get relevant context for specific task
     */
    getRelevantContext(taskType: any, parameters: any): Promise<{
        relevantFiles: never[];
        relevantSymbols: never[];
        relevanceScore: number;
        searchQuery?: undefined;
    } | {
        relevantFiles: any;
        relevantSymbols: any;
        relevanceScore: any;
        searchQuery: string;
    }>;
    /**
     * 🔤 Extract keywords from code for context search
     */
    extractKeywordsFromCode(code: any): string;
    /**
     * 🌿 Get Git context
     */
    getGitContext(): Promise<{
        hasGit: boolean;
        gitPath?: undefined;
    } | {
        hasGit: boolean;
        gitPath: string;
    }>;
    /**
     * 🌍 Get environment context
     */
    getEnvironmentContext(): Promise<{
        vscodeVersion: string;
        platform: NodeJS.Platform;
        nodeVersion: string;
        workspaceCount: number;
        extensionHost: string;
        language: string;
    } | {
        vscodeVersion?: undefined;
        platform?: undefined;
        nodeVersion?: undefined;
        workspaceCount?: undefined;
        extensionHost?: undefined;
        language?: undefined;
    }>;
    /**
     * 💬 Add message to chat history
     */
    addChatMessage(role: any, content: any, context?: {}): void;
    /**
     * 💬 Get chat history
     */
    getChatHistory(): any[];
    /**
     * 🔄 Clear chat history
     */
    clearChatHistory(): void;
    /**
     * 🆔 Generate session ID
     */
    generateSessionId(): string;
    /**
     * 📊 Get context statistics
     */
    getContextStats(): {
        sessionId: string;
        sessionDuration: number;
        chatHistoryLength: number;
        lastContextBuild: any;
    };
    /**
     * 🔧 Detect project type
     */
    detectProjectType(workspacePath: any): Promise<"unknown" | "python" | "java" | "csharp" | "php" | "ruby" | "go" | "rust" | "node">;
}
//# sourceMappingURL=noxContextBuilder.d.ts.map