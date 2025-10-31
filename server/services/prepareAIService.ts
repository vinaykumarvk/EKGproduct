import OpenAI from 'openai';
import fs from 'fs';
import { storage } from '../storage';
import { VectorStoreService } from './vectorStoreService';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

const vectorStoreService = new VectorStoreService();

export class PrepareAIService {
  
  /**
   * Prepare document for AI analysis by uploading to vector store
   * Step 1: Check if file exists in vector store by filename
   * Step 2: If not exists, upload to OpenAI and add to vector store
   * Step 3: Wait for embedding processing to complete
   * Step 4: Update document status to 'processed'
   */
  async prepareDocumentForAI(
    documentId: number,
    filePath: string,
    fileName: string
  ): Promise<{ success: boolean; message: string; fileId?: string }> {
    console.log(`Starting AI preparation for document ${documentId}: ${fileName}`);
    
    try {
      // Update status to processing
      await storage.updateDocument(documentId, {
        analysisStatus: 'processing'
      });
      
      // Step 1: Get or create vector store
      const vectorStore = await vectorStoreService.getOrCreateVectorStore();
      console.log(`Using vector store:`, vectorStore);
      
      if (!vectorStore || !vectorStore.id) {
        throw new Error('Failed to get or create vector store');
      }
      
      // Step 2: Check if file already exists in vector store
      const existingFile = await this.checkFileInVectorStore(vectorStore.id, fileName);
      
      if (existingFile) {
        console.log(`File ${fileName} already exists in vector store with ID: ${existingFile.id}`);
        
        // Update document status to completed
        await storage.updateDocument(documentId, {
          analysisStatus: 'completed',
          analysisResult: JSON.stringify({
            openai_file_id: existingFile.id,
            vector_store_id: vectorStore.id,
            status: 'already_processed'
          })
        });
        
        return {
          success: true,
          message: 'Document already prepared for AI',
          fileId: existingFile.id
        };
      }
      
      // Step 3: Use Python API for complete upload and attachment with metadata
      console.log('Using Python API for upload and vector store attachment with rich metadata...');
      
      // Import Python service
      const { pythonVectorStoreService } = await import('./pythonVectorStoreService.js');
      
      // Prepare custom attributes based on document context
      const documentRecord = await storage.getDocument(documentId);
      const customAttributes = {
        document_id: documentId.toString(),
        request_id: documentRecord?.requestId?.toString() || 'unknown',
        upload_user_id: documentRecord?.uploaderId?.toString() || 'unknown',
        system_source: 'investment_approval_system',
        processed_timestamp: new Date().toISOString()
      };
      
      // Use Python API for complete workflow
      const result = await pythonVectorStoreService.uploadAndAttachFile(
        filePath,
        vectorStore.id,
        customAttributes
      );
      
      console.log('Python API result:', result);
      
      if (!result.success) {
        throw new Error(`Python API failed: ${result.error}`);
      }
      
      const uploadedFile = result.file;
      
      // Step 4: Update document with Python API results
      if (result.success && result.vector_store_file?.status === 'completed') {
        await storage.updateDocument(documentId, {
          analysisStatus: 'completed',
          analysisResult: JSON.stringify({
            openai_file_id: result.file.id,
            vector_store_id: vectorStore.id,
            vector_store_file_id: result.vector_store_file.id,
            applied_attributes: result.applied_attributes,
            usage_bytes: result.vector_store_file.usage_bytes,
            metadata_extraction: {
              auto_company: result.applied_attributes?.company,
              auto_document_type: result.applied_attributes?.document_type,
              auto_year: result.applied_attributes?.year,
              auto_category: result.applied_attributes?.category
            },
            status: 'processed_with_metadata'
          })
        });
      } else {
        throw new Error(`Python API processing failed: ${result.error || 'Unknown error'}`);
      }
      
      console.log(`AI preparation completed for document ${documentId}`);
      
      return {
        success: true,
        message: 'Document prepared for AI successfully',
        fileId: uploadedFile.id
      };
      
    } catch (error) {
      console.error(`AI preparation failed for document ${documentId}:`, error);
      
      // Update document status to failed
      await storage.updateDocument(documentId, {
        analysisStatus: 'failed'
      });
      
      throw error;
    }
  }
  
  /**
   * Check if file exists in vector store by filename
   */
  private async checkFileInVectorStore(vectorStoreId: string, fileName: string): Promise<{ id: string } | null> {
    try {
      console.log(`Checking if file ${fileName} exists in vector store ${vectorStoreId}`);
      
      // List files in vector store
      const files = await openai.vectorStores.files.list(vectorStoreId);
      
      // Check each file by getting its details
      for (const file of files.data) {
        try {
          const fileDetails = await openai.files.retrieve(file.id);
          if (fileDetails.filename === fileName) {
            console.log(`Found existing file: ${fileName} with ID: ${file.id}`);
            return { id: file.id };
          }
        } catch (error) {
          console.error(`Error checking file ${file.id}:`, error);
          continue;
        }
      }
      
      console.log(`File ${fileName} not found in vector store`);
      return null;
      
    } catch (error) {
      console.error('Error checking files in vector store:', error);
      return null;
    }
  }
  

}

export const prepareAIService = new PrepareAIService();