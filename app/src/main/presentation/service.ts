import fs from 'fs';
import { dialog, BrowserWindow, screen } from 'electron';
import path from 'path';
import {
  Presentation,
  Slide,
  ContentElement,
} from '../../common/domain/entities/types';
import { PresentationState } from './state';
import { PresentationEventBus } from './event-bus';
import { resolveHtmlPath } from '../util';

const FILE_EXTENSION = '.kpres';

export class PresentationService {
  private state: PresentationState;

  private eventBus: PresentationEventBus;

  private currentFilePath: string | null = null;

  private fullscreenWindow: BrowserWindow | null = null;

  private selectedSlideId: string | null = null;

  constructor() {
    this.state = new PresentationState();
    this.eventBus = new PresentationEventBus();
  }

  getPresentation(): Presentation {
    return this.state.getPresentation();
  }

  initializePresentation(title = 'Untitled Presentation'): Presentation {
    const presentation = this.state.initializePresentation(title);
    this.currentFilePath = null;
    this.eventBus.broadcastToWindows(
      PresentationEventBus.events.INITIALIZED,
      presentation,
    );
    return presentation;
  }

  updatePresentationMeta(title: string): { title: string; updatedAt: Date } {
    const presentation = this.state.updatePresentationMeta(title);
    const data = {
      title: presentation.title,
      updatedAt: presentation.updatedAt,
    };
    this.eventBus.broadcastToWindows(
      PresentationEventBus.events.META_UPDATED,
      data,
    );
    return data;
  }

  addSlide(): Slide {
    const newSlide = this.state.addSlide();
    this.eventBus.broadcastToWindows(
      PresentationEventBus.events.SLIDE_ADDED,
      newSlide,
    );
    return newSlide;
  }

  updateSlide(slideId: string, updates: Partial<Slide>): Slide | null {
    const updatedSlide = this.state.updateSlide(slideId, updates);
    if (updatedSlide) {
      this.eventBus.broadcastToWindows(
        PresentationEventBus.events.SLIDE_UPDATED,
        updatedSlide,
      );
    }
    return updatedSlide;
  }

  deleteSlide(slideId: string): string | null {
    const deletedSlideId = this.state.deleteSlide(slideId);
    if (deletedSlideId) {
      this.eventBus.broadcastToWindows(
        PresentationEventBus.events.SLIDE_DELETED,
        deletedSlideId,
      );
    }
    return deletedSlideId;
  }

  reorderSlides(fromIndex: number, toIndex: number): Presentation {
    const updatedPresentation = this.state.reorderSlides(fromIndex, toIndex);
    this.eventBus.broadcastToWindows(
      PresentationEventBus.events.SLIDES_REORDERED,
      updatedPresentation,
    );
    return updatedPresentation;
  }

  addElement(slideId: string, element: ContentElement): Slide | null {
    const updatedSlide = this.state.addElement(slideId, element);
    if (updatedSlide) {
      this.eventBus.broadcastToWindows(
        PresentationEventBus.events.SLIDE_UPDATED,
        updatedSlide,
      );
    }
    return updatedSlide;
  }

  updateElement(
    elementId: string,
    updates: Partial<ContentElement>,
  ): Slide | null {
    const updatedSlide = this.state.updateElement(elementId, updates);
    if (updatedSlide) {
      this.eventBus.broadcastToWindows(
        PresentationEventBus.events.SLIDE_UPDATED,
        updatedSlide,
      );
    }
    return updatedSlide;
  }

  deleteElement(elementId: string): Slide | null {
    const updatedSlide = this.state.deleteElement(elementId);
    if (updatedSlide) {
      this.eventBus.broadcastToWindows(
        PresentationEventBus.events.SLIDE_UPDATED,
        updatedSlide,
      );
    }
    return updatedSlide;
  }

  onEvent(eventName: string, listener: (...args: any[]) => void): void {
    this.eventBus.on(eventName, listener);
  }

  offEvent(eventName: string, listener: (...args: any[]) => void): void {
    this.eventBus.off(eventName, listener);
  }

  /**
   * Saves the current presentation to a file
   * @param window The BrowserWindow to attach the dialog to
   * @param forceNewPath Force a "Save As" dialog even if the file has been saved before
   * @returns The path where the file was saved, or null if the operation was cancelled
   */
  async savePresentation(
    window: BrowserWindow,
    forceNewPath = false,
  ): Promise<string | null> {
    try {
      const filePath =
        forceNewPath || !this.currentFilePath
          ? await this.showSaveDialog(window)
          : this.currentFilePath;

      if (!filePath) {
        return null; // User cancelled the dialog
      }

      const presentation = this.state.getPresentation();

      // Create a serializable version of the presentation
      const serializedPresentation = {
        ...presentation,
        createdAt: presentation.createdAt.toISOString(),
        updatedAt: presentation.updatedAt.toISOString(),
      };

      // Write the file
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(serializedPresentation, null, 2),
      );

      this.currentFilePath = filePath;

      // Notify the renderer process
      this.eventBus.broadcastToWindows(PresentationEventBus.events.SAVED, {
        path: filePath,
        title: presentation.title,
      });

      return filePath;
    } catch (error) {
      console.error('Error saving presentation:', error);
      throw error;
    }
  }

  /**
   * Loads a presentation from a file
   * @param window The BrowserWindow to attach the dialog to
   * @param filePath Optional - specific file path to load from, or shows open dialog if not provided
   * @returns The loaded presentation or null if the operation was cancelled
   */
  async loadPresentation(
    window: BrowserWindow,
    filePath?: string,
  ): Promise<Presentation | null> {
    try {
      const path = filePath || (await this.showOpenDialog(window));

      if (!path) {
        return null; // User cancelled the dialog
      }

      // Read and parse the file
      const fileContent = await fs.promises.readFile(path, 'utf-8');
      const presentationData = JSON.parse(fileContent);

      // Convert ISO strings back to Date objects
      presentationData.createdAt = new Date(presentationData.createdAt);
      presentationData.updatedAt = new Date(presentationData.updatedAt);

      // Load the presentation into the state
      const loadedPresentation = this.state.loadPresentation(presentationData);
      this.currentFilePath = path;

      // Notify the renderer process
      this.eventBus.broadcastToWindows(
        PresentationEventBus.events.LOADED,
        loadedPresentation,
      );

      return loadedPresentation;
    } catch (error) {
      console.error('Error loading presentation:', error);
      throw error;
    }
  }

  /**
   * Returns the current file path (if saved)
   */
  getCurrentFilePath(): string | null {
    return this.currentFilePath;
  }

  /**
   * Shows a file save dialog and returns the selected path
   */
  private async showSaveDialog(window: BrowserWindow): Promise<string | null> {
    const presentation = this.state.getPresentation();
    const defaultPath = `${presentation.title}${FILE_EXTENSION}`;

    const { canceled, filePath } = await dialog.showSaveDialog(window, {
      title: 'Save Presentation',
      defaultPath,
      filters: [
        {
          name: 'KraftPo Presentations',
          extensions: [FILE_EXTENSION.substring(1)],
        },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    return canceled ? null : filePath || null;
  }

  /**
   * Shows a file open dialog and returns the selected path
   */
  private async showOpenDialog(window: BrowserWindow): Promise<string | null> {
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
      title: 'Open Presentation',
      properties: ['openFile'],
      filters: [
        {
          name: 'KraftPo Presentations',
          extensions: [FILE_EXTENSION.substring(1)],
        },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    return canceled ? null : filePaths.length > 0 ? filePaths[0] : null;
  }

  /**
   * Opens a fullscreen presentation window
   */
  openFullscreenPresentation(): void {
    if (this.fullscreenWindow) {
      this.fullscreenWindow.focus();
      return;
    }

    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();

    this.fullscreenWindow = new BrowserWindow({
      fullscreen: false,
      frame: false,
      width: primaryDisplay.bounds.width,
      height: primaryDisplay.bounds.height,
      x: primaryDisplay.bounds.x,
      y: primaryDisplay.bounds.y,
      webPreferences: {
        preload:
          process.env.NODE_ENV === 'production'
            ? path.join(__dirname, 'preload.js')
            : path.join(__dirname, '../../.erb/dll/preload.js'),
        partition: 'persist:main',
      },
    });

    // Maximize to ensure it covers the full screen
    this.fullscreenWindow.maximize();

    // Hide the menu bar
    this.fullscreenWindow.setMenuBarVisibility(false);

    this.fullscreenWindow.loadURL(
      `${resolveHtmlPath('index.html')}#/?layout=fullscreen`,
    );

    this.fullscreenWindow.on('closed', () => {
      this.fullscreenWindow = null;
    });

    this.eventBus.broadcastToWindows(
      PresentationEventBus.events.FULLSCREEN_OPENED,
      null,
    );
  }

  /**
   * Closes the fullscreen presentation window if open
   */
  closeFullscreenPresentation(): void {
    if (this.fullscreenWindow) {
      this.fullscreenWindow.close();
      this.fullscreenWindow = null;

      this.eventBus.broadcastToWindows(
        PresentationEventBus.events.FULLSCREEN_CLOSED,
        null,
      );
    }
  }

  /**
   * Returns whether a fullscreen window is currently open
   */
  isFullscreenOpen(): boolean {
    return this.fullscreenWindow !== null;
  }

  /**
   * Sets the selected slide ID for the presentation viewer
   */
  setSelectedSlideInViewer(slideId: string): void {
    this.selectedSlideId = slideId;
    this.eventBus.broadcastToWindows(
      'presentation:selected-slide-changed',
      slideId,
    );
  }

  /**
   * Gets the current selected slide ID
   */
  getSelectedSlideId(): string | null {
    return this.selectedSlideId;
  }
}
