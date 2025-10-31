/**
 * LLM Integration Service - Wrapper for LLM API service calls
 * Provides compatibility layer between Investment Portal and LLM microservice
 */

import { llmApiService } from './llmApiService';
import path from 'path';

interface DocumentProcessingResult {
  success: boolean;
  message: string;
  fileId?: string;
  analysisResult?: any;
  error?: string;
}

export class LLMIntegrationService {
  /**
   * Process document via LLM API service (replaces Python service)
   */
  async prepareDocumentForAI(
    documentId: number, 
    filePath: string, 
    filename: string,
    requestId?: number
  ): Promise<DocumentProcessingResult> {
    try {
      console.log(`Processing document ${documentId} via LLM API service`);
      
      // Upload and vectorize document with minimal attributes (OpenAI max: 16 properties total)
      const minimalAttributes = {
        document_id: documentId.toString(),
        request_id: requestId?.toString() || 'unknown'
      };
      
      const uploadResult = await llmApiService.uploadAndVectorize(
        filePath,
        filename,
        minimalAttributes
      );

      if (!uploadResult.success) {
        return {
          success: false,
          message: uploadResult.error || 'Document upload failed'
        };
      }

      console.log(`Document uploaded successfully: ${uploadResult.file?.id}`);

      // Generate analysis if upload succeeded
      let analysisResult = null;
      if (uploadResult.file?.id) {
        analysisResult = await llmApiService.analyzeDocument(
          uploadResult.file.id,
          'investment',
          {
            document_id: documentId.toString(),
            request_id: requestId?.toString(),
            analysis_scope: 'comprehensive'
          }
        );
      }

      return {
        success: true,
        message: 'Document processed successfully',
        fileId: uploadResult.file?.id,
        analysisResult: analysisResult?.success ? analysisResult : null
      };

    } catch (error) {
      console.error(`LLM service error for document ${documentId}:`, error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown LLM service error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Search documents via LLM API service
   */
  async searchDocuments(
    query: string,
    documentIds: string[] = [],
    context: Record<string, any> = {}
  ) {
    try {
      const result = await llmApiService.searchDocuments(query, documentIds, {
        ...context,
        source: 'investment_portal'
      });

      return {
        success: result.success,
        answer: result.response,
        sources: result.search_context,
        usage: result.usage,
        error: result.error
      };

    } catch (error) {
      console.error('Document search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  /**
   * Generate investment insights via LLM API service
   */
  async generateInvestmentInsights(
    documentIds: string[],
    analysisFocus: string = 'general',
    context: Record<string, any> = {}
  ) {
    try {
      const result = await llmApiService.investmentInsights(
        documentIds,
        analysisFocus,
        {
          ...context,
          source: 'investment_portal'
        }
      );

      return {
        success: result.success,
        insights: result.insights,
        analysis_focus: result.analysis_focus,
        usage: result.usage,
        error: result.error
      };

    } catch (error) {
      console.error('Investment insights error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Insights generation failed'
      };
    }
  }

  /**
   * Check LLM service health
   */
  async checkServiceHealth() {
    try {
      const health = await llmApiService.healthCheck();
      return {
        healthy: health.status === 'healthy',
        details: health
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }
}

// Export singleton instance
export const llmIntegrationService = new LLMIntegrationService();

// Export for backward compatibility with existing code
export const prepareAIService = {
  prepareDocumentForAI: llmIntegrationService.prepareDocumentForAI.bind(llmIntegrationService)
};