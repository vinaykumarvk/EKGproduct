/**
 * LLM API Service - Integration with dedicated LLM microservice
 * Replaces direct OpenAI/Python integrations with API calls
 */

import fs from 'fs';

interface LLMServiceConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
}

interface DocumentUploadResult {
  success: boolean;
  file?: {
    id: string;
    filename: string;
    bytes: number;
    status: string;
  };
  vector_store_file?: {
    id: string;
    status: string;
    usage_bytes: number;
    attributes: Record<string, any>;
  };
  applied_attributes?: Record<string, any>;
  error?: string;
}

interface DocumentAnalysisResult {
  success: boolean;
  analysis?: string;
  analysis_type?: string;
  document_id?: string;
  model?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  error?: string;
}

interface DocumentSearchResult {
  success: boolean;
  response?: string;
  model?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  search_context?: {
    query: string;
    document_ids: string[];
    vector_store_id: string;
  };
  error?: string;
}

interface ChatCompletionResult {
  success: boolean;
  response?: string;
  model?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  finish_reason?: string;
  error?: string;
}

interface InvestmentInsightsResult {
  success: boolean;
  insights?: string;
  analysis_focus?: string;
  document_ids?: string[];
  model?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  error?: string;
}

export class LLMApiService {
  private config: LLMServiceConfig;

  constructor(config?: Partial<LLMServiceConfig>) {
    this.config = {
      baseUrl: process.env.LLM_SERVICE_URL || 'https://llm-api-service-vinay2k.replit.app',
      apiKey: process.env.LLM_SERVICE_API_KEY || 'aa123456789bb',
      timeout: 300000, // 5 minutes
      ...config
    };
  }

  /**
   * Make authenticated request to LLM service
   */
  private async makeRequest(endpoint: string, options: any = {}): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const requestOptions = {
      timeout: this.config.timeout,
      headers: {
        'X-API-Key': this.config.apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, requestOptions);
      const data = await response.json() as any;

      if (!response.ok) {
        throw new Error(`LLM Service error (${response.status}): ${data.error || 'Unknown error'}`);
      }

      return data;
    } catch (error: any) {
      console.error(`LLM Service request failed: ${error.message}`);
      throw new Error(`LLM Service unavailable: ${error.message}`);
    }
  }

  /**
   * Upload document and add to vector store
   */
  async uploadAndVectorize(
    filePath: string,
    filename: string,
    customAttributes: Record<string, any> = {}
  ): Promise<DocumentUploadResult> {
    try {
      // Read file and convert to base64
      const fileBuffer = await fs.promises.readFile(filePath);
      const fileContent = fileBuffer.toString('base64');

      const payload = {
        file_content: fileContent,
        filename: filename,
        attributes: {
          ...customAttributes,
          upload_method: 'api_service',
          original_path: filePath
        }
      };

      return await this.makeRequest('/documents/upload-and-vectorize', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

    } catch (error: any) {
      console.error('Document upload failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze document content
   */
  async analyzeDocument(
    documentId: string,
    analysisType: string = 'investment',
    context: Record<string, any> = {}
  ): Promise<DocumentAnalysisResult> {
    try {
      const payload = {
        document_id: documentId,
        analysis_type: analysisType,
        context: context
      };

      return await this.makeRequest('/documents/analyze', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

    } catch (error: any) {
      console.error('Document analysis failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search across documents
   */
  async searchDocuments(
    query: string,
    documentIds: string[] = [],
    context: Record<string, any> = {}
  ): Promise<DocumentSearchResult> {
    try {
      const payload = {
        query: query,
        document_ids: documentIds,
        context: context
      };

      return await this.makeRequest('/documents/search', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

    } catch (error: any) {
      console.error('Document search failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate chat completion
   */
  async chatCompletion(
    messages: Array<{ role: string; content: string }>,
    model: string = 'gpt-4o',
    context: Record<string, any> = {}
  ): Promise<ChatCompletionResult> {
    try {
      const payload = {
        messages: messages,
        model: model,
        context: context
      };

      return await this.makeRequest('/chat/completion', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

    } catch (error: any) {
      console.error('Chat completion failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Document Q&A
   */
  async documentQA(
    question: string,
    documentIds: string[],
    context: Record<string, any> = {}
  ): Promise<DocumentSearchResult> {
    try {
      const payload = {
        question: question,
        document_ids: documentIds,
        context: context
      };

      return await this.makeRequest('/chat/document-qa', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

    } catch (error: any) {
      console.error('Document Q&A failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Summarize content
   */
  async summarize(
    content?: string,
    documentId?: string,
    summaryType: string = 'detailed'
  ): Promise<DocumentAnalysisResult> {
    try {
      const payload = {
        content: content,
        document_id: documentId,
        summary_type: summaryType
      };

      return await this.makeRequest('/analysis/summarize', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

    } catch (error: any) {
      console.error('Summarization failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate investment insights
   */
  async investmentInsights(
    documentIds: string[],
    analysisFocus: string = 'general',
    context: Record<string, any> = {}
  ): Promise<InvestmentInsightsResult> {
    try {
      const payload = {
        document_ids: documentIds,
        analysis_focus: analysisFocus,
        context: context
      };

      return await this.makeRequest('/analysis/investment-insights', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

    } catch (error: any) {
      console.error('Investment insights failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`);
      return await response.json();
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Get service metrics
   */
  async getMetrics(): Promise<any> {
    try {
      return await this.makeRequest('/metrics', { method: 'GET' });
    } catch (error: any) {
      return {
        error: error.message
      };
    }
  }

  /**
   * Generate summary and insights for a document
   */
  async generateSummaryAndInsights(fileName: string, metadata: any = {}): Promise<any> {
    try {
      // Use the existing investmentInsights method with single document
      const result = await this.investmentInsights([fileName], 'comprehensive', metadata);
      
      if (!result.success) {
        return result;
      }
      
      // Parse insights to extract summary and insights
      const insights = result.insights || 'Analysis completed for investment document.';
      
      return {
        success: true,
        summary: insights.substring(0, Math.min(500, insights.length)) + '...',
        insights: insights,
        classification: 'investment_document',
        riskAssessment: metadata.risk_level || 'medium',
        keyInformation: 'Document processed successfully via LLM service',
        usage: result.usage,
        model: result.model
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis generation failed'
      };
    }
  }

  /**
   * Get service information
   */
  async getServiceInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/info`);
      return await response.json();
    } catch (error: any) {
      return {
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const llmApiService = new LLMApiService();

// Helper function to convert file path to document processing
export async function processDocumentViaAPI(
  filePath: string,
  filename: string,
  analysisType: string = 'investment',
  customAttributes: Record<string, any> = {}
): Promise<{
  uploadResult: DocumentUploadResult;
  analysisResult?: DocumentAnalysisResult;
}> {
  const uploadResult = await llmApiService.uploadAndVectorize(
    filePath, 
    filename, 
    customAttributes
  );

  if (!uploadResult.success || !uploadResult.file?.id) {
    return { uploadResult };
  }

  const analysisResult = await llmApiService.analyzeDocument(
    uploadResult.file.id,
    analysisType,
    { filename, ...customAttributes }
  );

  return {
    uploadResult,
    analysisResult
  };
}

// Export service configuration validator
export function validateLLMServiceConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!process.env.LLM_SERVICE_URL) {
    errors.push('LLM_SERVICE_URL environment variable is required');
  }

  if (!process.env.LLM_SERVICE_API_KEY) {
    errors.push('LLM_SERVICE_API_KEY environment variable is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}