import OpenAI from 'openai';
import { VectorStoreService } from './vectorStoreService';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

const vectorStoreService = new VectorStoreService();

export async function createOrGetAssistant(): Promise<string> {
  try {
    // List existing assistants to find our document analyzer
    const assistants = await openai.beta.assistants.list();
    
    // Look for existing assistant
    const existingAssistant = assistants.data.find(
      assistant => assistant.name === 'Document Analysis Assistant'
    );
    
    if (existingAssistant) {
      console.log(`Using existing assistant: ${existingAssistant.id}`);
      return existingAssistant.id;
    }
    
    // Get or create vector store
    const vectorStore = await vectorStoreService.getOrCreateVectorStore();
    console.log(`Using vector store: ${vectorStore.id}`);
    
    // Create new assistant with proper vector store
    const assistant = await openai.beta.assistants.create({
      name: 'Document Analysis Assistant',
      instructions: `You are an expert financial document analyst. Your role is to analyze documents uploaded to the vector store and provide detailed insights including:

1. Key financial figures and metrics
2. Important dates and deadlines
3. Risk factors and assessments
4. Company information and parties involved
5. Recommendations and insights

Always provide specific, accurate information extracted from the documents. If you cannot find specific information, clearly state that it was not found in the document.

When analyzing documents:
- Extract all financial numbers, percentages, and metrics
- Identify key dates, deadlines, and time periods
- Note all company names, parties, and entities mentioned
- Assess risks and provide risk levels (low, medium, high)
- Provide actionable recommendations
- Be specific and detailed in your responses`,
      model: "gpt-4o",
      tools: [{ type: "file_search" }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.id]
        }
      }
    });
    
    console.log(`Created new assistant: ${assistant.id}`);
    return assistant.id;
    
  } catch (error) {
    console.error('Error creating/getting assistant:', error);
    throw error;
  }
}