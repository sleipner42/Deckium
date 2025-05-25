import * as fs from 'fs';
import * as path from 'path';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'debug' | 'warn' | 'error';
  category: 'ai-request' | 'ai-response' | 'ai-conversation' | 'tool-execution' | 'system' | 'user-action';
  message: string;
  data?: any;
  sessionId?: string;
}

export class Logger {
  private static instance: Logger;
  private isEnabled: boolean = false;
  private logToFile: boolean = false;
  private logToConsole: boolean = true;
  private logLevel: string = 'info';
  private logDirectory: string;
  private currentSessionId: string;
  private conversationLogEnabled: boolean = false;

  private constructor() {
    this.loadConfiguration();
    this.logDirectory = path.join(process.cwd(), 'logs');
    this.currentSessionId = this.generateSessionId();
    this.ensureLogDirectory();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private loadConfiguration(): void {
    try {
      // Try to read .env file
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const envVars = this.parseEnvFile(envContent);
        
        // Apply environment variables
        Object.entries(envVars).forEach(([key, value]) => {
          if (!process.env[key]) {
            process.env[key] = value;
          }
        });
      }
    } catch (error) {
      console.warn('Could not read .env file, using default logging configuration');
    }

    // Configure logging based on environment variables
    this.isEnabled = this.parseBooleanEnv('LOG_ENABLED', false);
    this.logToFile = this.parseBooleanEnv('LOG_TO_FILE', true);
    this.logToConsole = this.parseBooleanEnv('LOG_TO_CONSOLE', true);
    this.logLevel = process.env.LOG_LEVEL || 'info';

    // AI-specific logging configuration
    const aiLoggingEnabled = this.parseBooleanEnv('AI_LOGGING_ENABLED', false);
    if (aiLoggingEnabled) {
      this.isEnabled = true;
    }

    // Conversation-only log file configuration
    this.conversationLogEnabled = this.parseBooleanEnv('CONVERSATION_LOG_ENABLED', true);
  }

  private parseEnvFile(content: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Remove quotes if present
          const unquotedValue = value.replace(/^["']|["']$/g, '');
          result[key.trim()] = unquotedValue;
        }
      }
    }
    
    return result;
  }

  private parseBooleanEnv(key: string, defaultValue: boolean): boolean {
    const value = process.env[key]?.toLowerCase();
    if (value === 'true' || value === '1' || value === 'yes' || value === 'on') {
      return true;
    }
    if (value === 'false' || value === '0' || value === 'no' || value === 'off') {
      return false;
    }
    return defaultValue;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private ensureLogDirectory(): void {
    if (this.logToFile && !fs.existsSync(this.logDirectory)) {
      try {
        fs.mkdirSync(this.logDirectory, { recursive: true });
      } catch (error) {
        console.warn('Could not create log directory:', error);
        this.logToFile = false;
      }
    }
  }

  private shouldLog(level: string): boolean {
    if (!this.isEnabled) return false;
    
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatLogEntry(entry: LogEntry): string {
    const dataStr = entry.data ? `\nData: ${JSON.stringify(entry.data, null, 2)}` : '';
    const sessionStr = entry.sessionId ? ` [${entry.sessionId}]` : '';
    
    return `[${entry.timestamp}]${sessionStr} [${entry.level.toUpperCase()}] [${entry.category}] ${entry.message}${dataStr}`;
  }

  private writeToFile(logEntry: string): void {
    if (!this.logToFile) return;
    
    try {
      const fileName = `ai-debug-${new Date().toISOString().split('T')[0]}.log`;
      const filePath = path.join(this.logDirectory, fileName);
      fs.appendFileSync(filePath, logEntry + '\n', 'utf-8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private writeToConversationFile(entry: string): void {
    if (!this.logToFile || !this.conversationLogEnabled) return;
    
    try {
      const fileName = `conversation-${new Date().toISOString().split('T')[0]}.log`;
      const filePath = path.join(this.logDirectory, fileName);
      
      // Add header if file doesn't exist
      if (!fs.existsSync(filePath)) {
        const header = `# AI Agent Conversation Log - ${new Date().toISOString().split('T')[0]}\n` +
                      `# Format: TIMESTAMP | ROLE      | MESSAGE CONTENT\n` +
                      `# ======================================================\n`;
        fs.writeFileSync(filePath, header, 'utf-8');
      }
      
      fs.appendFileSync(filePath, entry + '\n', 'utf-8');
    } catch (error) {
      console.error('Failed to write to conversation log file:', error);
    }
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const formattedEntry = this.formatLogEntry(entry);
    
    if (this.logToConsole) {
      switch (entry.level) {
        case 'error':
          console.error(formattedEntry);
          break;
        case 'warn':
          console.warn(formattedEntry);
          break;
        case 'debug':
          console.debug(formattedEntry);
          break;
        default:
          console.log(formattedEntry);
      }
    }
    
    if (this.logToFile) {
      this.writeToFile(formattedEntry);
    }
  }

  // Public logging methods
  public logAIRequest(message: string, data?: any): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      category: 'ai-request',
      message,
      data,
      sessionId: this.currentSessionId
    });
  }

  public logAIResponse(message: string, data?: any): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      category: 'ai-response',
      message,
      data,
      sessionId: this.currentSessionId
    });
  }

  public logConversation(message: string, data?: any): void {
    // Log to main log file
    this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      category: 'ai-conversation',
      message,
      data,
      sessionId: this.currentSessionId
    });

    // Also write to clean conversation log file
    this.writeCleanConversationEntry(data);
  }

  private writeCleanConversationEntry(data: any): void {
    if (!data || !data.role || !data.content) return;

    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    const role = data.role.toUpperCase().padEnd(9); // Pad for alignment
    
    // Format content based on type
    let content = '';
    if (typeof data.content === 'string') {
      content = data.content;
    } else if (Array.isArray(data.content)) {
      // Handle multi-content (text + images)
      const textParts = data.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join(' ');
      const imageParts = data.content
        .filter(item => item.type === 'image_url')
        .map(() => '[IMAGE]');
      content = textParts + (imageParts.length > 0 ? ' ' + imageParts.join(' ') : '');
    } else {
      content = JSON.stringify(data.content);
    }

    // Truncate very long content for readability
    if (content.length > 500) {
      content = content.substring(0, 500) + '... [TRUNCATED]';
    }

    // Clean up content for single-line display
    content = content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    const conversationEntry = `${timestamp} | ${role} | ${content}`;
    this.writeToConversationFile(conversationEntry);
  }

  public logToolExecution(toolName: string, params: any, result?: any): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'debug',
      category: 'tool-execution',
      message: `Tool executed: ${toolName}`,
      data: { params, result },
      sessionId: this.currentSessionId
    });
  }

  public logUserAction(action: string, data?: any): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      category: 'user-action',
      message: action,
      data,
      sessionId: this.currentSessionId
    });
  }

  public logSystem(message: string, level: 'info' | 'debug' | 'warn' | 'error' = 'info', data?: any): void {
    this.log({
      timestamp: new Date().toISOString(),
      level,
      category: 'system',
      message,
      data,
      sessionId: this.currentSessionId
    });
  }

  // Utility methods
  public isLoggingEnabled(): boolean {
    return this.isEnabled;
  }

  public getCurrentSessionId(): string {
    return this.currentSessionId;
  }

  public startNewSession(): string {
    this.currentSessionId = this.generateSessionId();
    this.logSystem('New logging session started', 'info', { sessionId: this.currentSessionId });
    return this.currentSessionId;
  }

  public getLogDirectory(): string {
    return this.logDirectory;
  }

  public getConversationLogPath(): string {
    const fileName = `conversation-${new Date().toISOString().split('T')[0]}.log`;
    return path.join(this.logDirectory, fileName);
  }

  // Configuration reload
  public reloadConfiguration(): void {
    this.loadConfiguration();
    this.logSystem('Logger configuration reloaded', 'info');
  }

  // Export logs
  public exportSessionLogs(sessionId?: string): string[] {
    const targetSessionId = sessionId || this.currentSessionId;
    const logs: string[] = [];
    
    if (!this.logToFile) {
      return logs;
    }

    try {
      const files = fs.readdirSync(this.logDirectory);
      const logFiles = files.filter(file => file.endsWith('.log'));
      
      for (const file of logFiles) {
        const content = fs.readFileSync(path.join(this.logDirectory, file), 'utf-8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          if (line.includes(`[${targetSessionId}]`)) {
            logs.push(line);
          }
        }
      }
    } catch (error) {
      this.logSystem('Failed to export session logs', 'error', { error: error.message });
    }
    
    return logs;
  }

  // Clean up old logs
  public cleanupOldLogs(daysToKeep: number = 7): void {
    if (!this.logToFile) return;

    try {
      const files = fs.readdirSync(this.logDirectory);
      const now = Date.now();
      const cutoffTime = now - (daysToKeep * 24 * 60 * 60 * 1000);

      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logDirectory, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            fs.unlinkSync(filePath);
            this.logSystem(`Deleted old log file: ${file}`, 'info');
          }
        }
      }
    } catch (error) {
      this.logSystem('Failed to cleanup old logs', 'error', { error: error.message });
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();