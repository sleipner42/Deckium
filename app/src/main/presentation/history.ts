import { Command } from './commands';

export class CommandHistory {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistorySize = 50;
  private isGrouping = false;
  private groupTimer: NodeJS.Timeout | null = null;
  private groupDelay = 500; // 500ms delay to group commands

  executeCommand(command: Command): void {
    // Execute the command
    command.execute();

    // Handle command grouping for continuous operations
    this.handleCommandGrouping(command);
  }

  private handleCommandGrouping(command: Command): void {
    const description = command.getDescription();
    
    // Commands that should be grouped together (replace previous command of same type)
    const shouldGroup = description === 'Move element' || 
                       description === 'Resize element' || 
                       description.startsWith('Update') && description.includes('element');

    if (shouldGroup && this.undoStack.length > 0) {
      const lastCommand = this.undoStack[this.undoStack.length - 1];
      const lastDescription = lastCommand.getDescription();
      
      // Group similar operations together
      const isMoveSimilar = (desc1: string, desc2: string) => 
        desc1 === 'Move element' && desc2 === 'Move element';
      
      const isResizeSimilar = (desc1: string, desc2: string) => 
        desc1 === 'Resize element' && desc2 === 'Resize element';
        
      const isUpdateSimilar = (desc1: string, desc2: string) =>
        desc1.startsWith('Update') && desc1.includes('element') &&
        desc2.startsWith('Update') && desc2.includes('element') &&
        desc1 === desc2;
      
      // If the last command is similar type, replace it instead of adding a new one
      if (isMoveSimilar(lastDescription, description) || 
          isResizeSimilar(lastDescription, description) ||
          isUpdateSimilar(lastDescription, description)) {
        this.undoStack[this.undoStack.length - 1] = command;
        this.clearRedoStack();
        return;
      }
    }

    // Add to undo stack normally
    this.addToUndoStack(command);
  }

  private addToUndoStack(command: Command): void {
    this.undoStack.push(command);
    this.clearRedoStack();

    // Limit the size of the undo stack
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }

  private clearRedoStack(): void {
    this.redoStack = [];
  }

  undo(): boolean {
    if (this.undoStack.length === 0) {
      return false;
    }

    const command = this.undoStack.pop()!;
    command.undo();
    this.redoStack.push(command);

    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) {
      return false;
    }

    const command = this.redoStack.pop()!;
    command.execute();
    this.undoStack.push(command);

    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoDescription(): string | null {
    if (this.undoStack.length === 0) {
      return null;
    }
    return this.undoStack[this.undoStack.length - 1].getDescription();
  }

  getRedoDescription(): string | null {
    if (this.redoStack.length === 0) {
      return null;
    }
    return this.redoStack[this.redoStack.length - 1].getDescription();
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getHistorySize(): { undoCount: number; redoCount: number } {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
    };
  }
}