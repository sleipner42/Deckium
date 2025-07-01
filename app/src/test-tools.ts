import { AIToolsService } from './renderer/domain/services';

// Test context
const testContext = {
    presentationId: 'test-presentation-id',
    slideId: 'test-slide-id',
};

// Test getDeveloperPrompt
try {
    const developerPrompt = AIToolsService.getDeveloperPrompt(testContext);
    console.log('getDeveloperPrompt exists and works!');
    console.log('Developer Prompt length:', developerPrompt.length);
} catch (error) {
    console.error('Error calling getDeveloperPrompt:', error);
}

// Test getSystemPrompt (for backward compatibility)
try {
    const systemPrompt = AIToolsService.getSystemPrompt(testContext);
    console.log('getSystemPrompt exists and works!');
    console.log('System Prompt length:', systemPrompt.length);
} catch (error) {
    console.error('Error calling getSystemPrompt:', error);
}

// Also try to call the getBuiltInTools function for comparison
try {
    const tools = AIToolsService.getBuiltInTools(testContext);
    console.log('getBuiltInTools exists and works!');
    console.log('Number of tools:', tools.length);
} catch (error) {
    console.error('Error calling getBuiltInTools:', error);
}
