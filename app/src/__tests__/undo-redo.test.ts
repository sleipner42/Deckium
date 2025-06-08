import { PresentationState } from '../main/presentation/state';
import { CommandHistory } from '../main/presentation/history';
import { AddSlideCommand, DeleteSlideCommand } from '../main/presentation/commands';
import { PresentationEventBus } from '../main/presentation/event-bus';

// Mock crypto.randomUUID for the test environment
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => Math.random().toString(36).substr(2, 9),
  },
});

// Mock Electron's BrowserWindow
jest.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [],
  },
}));

describe('Undo/Redo Functionality', () => {
  let state: PresentationState;
  let history: CommandHistory;
  let eventBus: PresentationEventBus;

  beforeEach(() => {
    state = new PresentationState();
    history = new CommandHistory();
    eventBus = new PresentationEventBus();
  });

  test('should undo slide addition', () => {
    const initialSlideCount = state.getPresentation().slides.length;
    
    // Add a slide
    const addCommand = new AddSlideCommand(state, eventBus);
    history.executeCommand(addCommand);
    
    expect(state.getPresentation().slides.length).toBe(initialSlideCount + 1);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
    
    // Undo the addition
    const undoSuccess = history.undo();
    
    expect(undoSuccess).toBe(true);
    expect(state.getPresentation().slides.length).toBe(initialSlideCount);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);
  });

  test('should redo slide addition after undo', () => {
    const initialSlideCount = state.getPresentation().slides.length;
    
    // Add a slide
    const addCommand = new AddSlideCommand(state, eventBus);
    history.executeCommand(addCommand);
    
    // Undo the addition
    history.undo();
    
    // Redo the addition
    const redoSuccess = history.redo();
    
    expect(redoSuccess).toBe(true);
    expect(state.getPresentation().slides.length).toBe(initialSlideCount + 1);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
  });

  test('should clear redo stack when new command is executed', () => {
    // Add a slide
    const addCommand = new AddSlideCommand(state, eventBus);
    history.executeCommand(addCommand);
    
    // Undo it
    history.undo();
    expect(history.canRedo()).toBe(true);
    
    // Add another slide (should clear redo stack)
    const addCommand2 = new AddSlideCommand(state, eventBus);
    history.executeCommand(addCommand2);
    
    expect(history.canRedo()).toBe(false);
    expect(history.canUndo()).toBe(true);
  });

  test('should have correct descriptions', () => {
    // Add a slide
    const addCommand = new AddSlideCommand(state, eventBus);
    history.executeCommand(addCommand);
    
    expect(history.getUndoDescription()).toBe('Add slide');
    expect(history.getRedoDescription()).toBe(null);
    
    // Undo it
    history.undo();
    
    expect(history.getUndoDescription()).toBe(null);
    expect(history.getRedoDescription()).toBe('Add slide');
  });
});