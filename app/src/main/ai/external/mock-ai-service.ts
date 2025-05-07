import { Message } from '../../../common/domain/entities/ai-types';
import { IAIService, IAIServiceFactory, MessageContent } from '../../../common/domain/interfaces/ai-service.interface';

export class MockAIService implements IAIService {
  async chat(messages: Message[], deploymentName?: string): Promise<string> {
    console.log('Using MockAIService for chat completion');
    
    let userMessage = '';
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    
    if (lastUserMessage) {
      if (typeof lastUserMessage.content === 'string') {
        userMessage = lastUserMessage.content;
      } else if (Array.isArray(lastUserMessage.content)) {
        const textContents = lastUserMessage.content
          .filter(item => item.type === 'text' && item.text)
          .map(item => (item as MessageContent & { text: string }).text);
        
        const imageContents = lastUserMessage.content
          .filter(item => item.type === 'image_url' && item.image_url)
          .map(item => `[Image: ${(item as MessageContent & { image_url: { url: string } }).image_url.url}]`);
        
        userMessage = [...textContents, ...imageContents].join('\n');
        
        if (imageContents.length > 0) {
          console.log(`Received ${imageContents.length} image(s) in the message`);
        }
      }
    }
    
    console.log(`Last user message: ${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}`);
    
    // Basic response based on user message content
    if (userMessage.toLowerCase().includes('image') || userMessage.includes('[Image:')) {
      return 'I can see you\'ve shared an image with me. In a real environment, I would analyze this image and provide relevant insights.';
    }
    
    if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
      return 'Hello! I am a mock AI assistant. How can I help you with your presentation today?';
    }
    
    if (userMessage.toLowerCase().includes('help')) {
      return 'I can help you create and manage your presentation. Here are some things I can do:\n\n' +
        '- Create new slides\n' +
        '- Add text elements to slides\n' +
        '- Add and edit shapes (rectangles, circles, triangles)\n' +
        '- Create and update bar charts\n' +
        '- Align and distribute elements on slides\n' +
        '- Suggest design improvements\n' +
        '- Summarize your presentation content';
    }
    
    if (userMessage.toLowerCase().includes('slide') || userMessage.toLowerCase().includes('create')) {
      return 'I can help with slide creation. Would you like me to create a new slide for you?\n\n' +
        '### Action ###\n' +
        '{ "tool": "createSlide", "params": { "title": "New Slide" } }';
    }

    if (userMessage.toLowerCase().includes('get presentation info')) {
      return 'I can help you get information about your presentation. Would you like me to get the presentation info for you?\n\n' +
        '### Action ###\n' +
        '{ "tool": "getPresentationInfo", "params": {} }';
    }
    
    if (userMessage.toLowerCase().includes('bar chart') || userMessage.toLowerCase().includes('barchart') || (userMessage.toLowerCase().includes('chart') && !userMessage.toLowerCase().includes('shape'))) {
      return 'I can create a bar chart for your slide. Would you like me to create a bar chart?\n\n' +
        '### Action ###\n' +
        '{ "tool": "createBarChart", "params": { "slideId": "SLIDE_ID", "title": "Sales Data", "xAxisLabel": "Months", "yAxisLabel": "Revenue", "xData": "Jan,Feb,Mar,Apr", "yData": "10000,15000,12000,18000" } }';
    }
    
    if (userMessage.toLowerCase().includes('update chart') || userMessage.toLowerCase().includes('edit chart')) {
      return 'I can update an existing bar chart on your slide. Would you like me to update a bar chart?\n\n' +
        '### Action ###\n' +
        '{ "tool": "updateBarChart", "params": { "elementId": "CHART_ID", "title": "Updated Sales Data", "xData": "Q1,Q2,Q3,Q4", "yData": "25000,30000,28000,35000" } }';
    }
    
    if (userMessage.toLowerCase().includes('create shape') || 
       userMessage.toLowerCase().includes('add shape') || 
       userMessage.toLowerCase().includes('rectangle') || 
       userMessage.toLowerCase().includes('circle') || 
       userMessage.toLowerCase().includes('triangle')) {
      
      let shapeType = 'rectangle';
      if (userMessage.toLowerCase().includes('circle')) {
        shapeType = 'circle';
      } else if (userMessage.toLowerCase().includes('triangle')) {
        shapeType = 'triangle';
      }
      
      return `I can create a ${shapeType} shape for your slide. Would you like me to create it?\n\n` +
        '### Action ###\n' +
        `{ "tool": "createShape", "params": { "slideId": "SLIDE_ID", "shapeType": "${shapeType}", "fillColor": "#E0F7FA", "strokeColor": "#00BCD4", "strokeWidth": 2 } }`;
    }
    
    if (userMessage.toLowerCase().includes('update shape') || 
       userMessage.toLowerCase().includes('edit shape') || 
       userMessage.toLowerCase().includes('modify shape')) {
      
      return 'I can update an existing shape on your slide. Would you like me to update a shape?\n\n' +
        '### Action ###\n' +
        '{ "tool": "updateShape", "params": { "elementId": "SHAPE_ID", "fillColor": "#F5F5F5", "strokeColor": "#9E9E9E", "strokeWidth": 3 } }';
    }
    
    if (userMessage.toLowerCase().includes('align') || 
       userMessage.toLowerCase().includes('distribute') ||
       userMessage.toLowerCase().includes('arrangement') ||
       userMessage.toLowerCase().includes('position elements')) {
      
      let alignType = 'center-horizontal';
      
      if (userMessage.toLowerCase().includes('top')) {
        alignType = 'top';
      } else if (userMessage.toLowerCase().includes('bottom')) {
        alignType = 'bottom';
      } else if (userMessage.toLowerCase().includes('left')) {
        alignType = 'left';
      } else if (userMessage.toLowerCase().includes('right')) {
        alignType = 'right';
      } else if (userMessage.toLowerCase().includes('distribute') && userMessage.toLowerCase().includes('horizontal')) {
        alignType = 'distribute-horizontal';
      } else if (userMessage.toLowerCase().includes('distribute') && userMessage.toLowerCase().includes('vertical')) {
        alignType = 'distribute-vertical';
      } else if (userMessage.toLowerCase().includes('vertical')) {
        alignType = 'center-vertical';
      }
      
      const includeReference = userMessage.toLowerCase().includes('reference') || 
                              userMessage.toLowerCase().includes('relative') || 
                              userMessage.toLowerCase().includes('to this') ||
                              userMessage.toLowerCase().includes('align with');
      
      const referenceParam = includeReference ? ', "referenceElementId": "REFERENCE_ELEMENT_ID"' : '';
      
      return `I can help align elements on your slide. Would you like me to align them ${alignType.replace('-', ' ')}?\n\n` +
        '### Action ###\n' +
        `{ "tool": "alignElements", "params": { "slideId": "SLIDE_ID", "elementIds": "ELEMENT_ID_1,ELEMENT_ID_2,ELEMENT_ID_3", "alignType": "${alignType}"${referenceParam} } }`;
    }
    
    return 'I\'m a mock AI service. In a real environment, I would provide a more detailed and contextual response based on your query. For now, I can simulate basic interactions and tool calls.';
  }

  async chatStream(
    messages: Message[],
    onChunk: (chunk: string) => void,
    deploymentName?: string
  ): Promise<string> {
    console.log('Using MockAIService for streaming chat completion');
    
    // Generate response based on user message
    let userMessage = '';
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    
    if (lastUserMessage) {
      if (typeof lastUserMessage.content === 'string') {
        userMessage = lastUserMessage.content;
      } else if (Array.isArray(lastUserMessage.content)) {
        const textContents = lastUserMessage.content
          .filter(item => item.type === 'text' && item.text)
          .map(item => (item as MessageContent & { text: string }).text);
        
        userMessage = textContents.join('\n');
      }
    }
    
    console.log(`Streaming response for message: ${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}`);
    
    // Generate a more detailed response for slide creation to showcase the continuing behavior
    let response = '';
    
    if (userMessage.toLowerCase().includes('presentation') || 
        userMessage.toLowerCase().includes('create slides') || 
        userMessage.toLowerCase().includes('make slides')) {
      
      // First, get presentation info
      response = "I'll help you create a presentation. Let me first check what we're working with.\n\n" +
        "### Action ###\n" +
        '{ "tool": "getPresentationInfo", "params": {} }';
      
      // Simulate streaming response by sending chunks
      await this.streamResponse(response, onChunk);
      return response;
    }
    
    // Handle response after getting presentation info
    if (userMessage.toLowerCase().includes('tool execution completed') && 
        messages.some(m => m.content && typeof m.content === 'string' && m.content.includes('getPresentationInfo'))) {
      
      response = "Now I'll create a new slide for your presentation. I'll make it about the key benefits of your product.\n\n" +
        "### Action ###\n" +
        '{ "tool": "createSlide", "params": { "title": "Key Benefits" } }';
      
      await this.streamResponse(response, onChunk);
      return response;
    }
    
    // Handle response after creating a slide
    if (userMessage.toLowerCase().includes('tool execution completed') && 
        messages.some(m => m.content && typeof m.content === 'string' && m.content.includes('createSlide'))) {
      
      response = "Great! I've created a slide with the title 'Key Benefits'. Now, let me add some bullet points to it.\n\n" +
        "### Action ###\n" +
        '{ "tool": "addTextElement", "params": { "slideId": "SLIDE_ID", "text": "- Increased efficiency\\n- Cost reduction\\n- Better user experience\\n- Seamless integration", "x": 100, "y": 200, "width": 400, "height": 300 } }';
      
      await this.streamResponse(response, onChunk);
      return response;
    }
    
    // Handle response after adding text element
    if (userMessage.toLowerCase().includes('tool execution completed') && 
        messages.some(m => m.content && typeof m.content === 'string' && m.content.includes('addTextElement'))) {
      
      response = "Now I'll add a shape to highlight the important information.\n\n" +
        "### Action ###\n" +
        '{ "tool": "createShape", "params": { "slideId": "SLIDE_ID", "shapeType": "rectangle", "x": 80, "y": 180, "width": 440, "height": 320, "fillColor": "#E3F2FD", "strokeColor": "#2196F3", "strokeWidth": 2 } }';
      
      await this.streamResponse(response, onChunk);
      return response;
    }
    
    // Handle response after creating a shape
    if (userMessage.toLowerCase().includes('tool execution completed') && 
        messages.some(m => m.content && typeof m.content === 'string' && m.content.includes('createShape'))) {
      
      response = "I've completed the slide with a title, bullet points, and a background shape. The slide looks great! Now let's make sure everything is properly aligned.\n\n" +
        "### Action ###\n" + 
        '{ "tool": "alignElements", "params": { "slideId": "SLIDE_ID", "elementIds": "ELEMENT_ID_1,ELEMENT_ID_2", "alignType": "center-horizontal" } }';
      
      await this.streamResponse(response, onChunk);
      return response;
    }
    
    // Default response
    response = await this.chat(messages, deploymentName);
    await this.streamResponse(response, onChunk);
    return response;
  }
  
  private async streamResponse(text: string, onChunk: (chunk: string) => void): Promise<void> {
    const chunks = this.splitIntoChunks(text);
    
    for (const chunk of chunks) {
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay between chunks
      onChunk(chunk);
    }
  }
  
  private splitIntoChunks(text: string, avgChunkSize: number = 10): string[] {
    const chunks: string[] = [];
    let currentPos = 0;
    
    while (currentPos < text.length) {
      // Vary chunk size slightly to make it more realistic
      const randomVariance = Math.floor(Math.random() * 6) - 3; // -3 to +3
      const chunkSize = Math.max(2, avgChunkSize + randomVariance);
      
      // Don't exceed text length
      const endPos = Math.min(currentPos + chunkSize, text.length);
      
      // Extract chunk
      const chunk = text.substring(currentPos, endPos);
      chunks.push(chunk);
      
      currentPos = endPos;
    }
    
    return chunks;
  }
}

export class MockAIServiceFactory implements IAIServiceFactory {
  createService(): IAIService {
    console.log('Creating MockAIService');
    return new MockAIService();
  }
} 