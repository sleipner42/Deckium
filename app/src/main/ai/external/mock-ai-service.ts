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
}

export class MockAIServiceFactory implements IAIServiceFactory {
  createService(): IAIService {
    console.log('Creating MockAIService');
    return new MockAIService();
  }
} 