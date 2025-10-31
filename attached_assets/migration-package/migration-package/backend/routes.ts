import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authMiddleware } from "./middleware/auth";
import { investmentService } from "./services/investmentService";
import { workflowService } from "./services/workflowService";
import { notificationService } from "./services/notificationService";
import { authService } from "./services/authService";
import { documentAnalysisService } from "./services/documentAnalysisService";
import { vectorStoreService } from "./services/vectorStoreService";
import { backgroundJobService } from "./services/backgroundJobService";
import { fileUpload } from "./utils/fileUpload";
import { db } from "./db";
import { insertInvestmentRequestSchema, insertCashRequestSchema, insertUserSchema, insertTemplateSchema, insertInvestmentRationaleSchema, documents, backgroundJobs } from "@shared/schema";
import { enhanceText, type EnhancementType } from "./services/textEnhancementService.js";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import path from "path";
import fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);
      
      if (!result.success) {
        return res.status(401).json({ message: result.message });
      }
      
      // Set session
      req.session.userId = result.user!.id;
      req.session.userRole = result.user!.role;
      
      res.json({ user: result.user, message: 'Login successful' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const result = await authService.register(userData);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      res.json({ user: result.user, message: 'Registration successful' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/logout', authMiddleware, async (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: 'Could not log out' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.userId!);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/dashboard/enhanced-stats', authMiddleware, async (req, res) => {
    try {
      const stats = await storage.getEnhancedDashboardStats(req.userId!);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching enhanced dashboard stats:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/dashboard/recent-requests', authMiddleware, async (req, res) => {
    try {
      // Get current user to check role
      const currentUser = await storage.getUser(req.userId!);
      console.log('Current user for recent requests:', currentUser);
      
      // Analysts can only see their own requests
      const userId = currentUser?.role === 'analyst' ? req.userId : undefined;
      console.log('Using userId filter:', userId);
      
      const requests = await storage.getRecentRequests(10, userId);
      console.log('Found requests:', requests);
      res.json(requests);
    } catch (error) {
      console.error('Error in recent requests endpoint:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Investment request routes
  app.post('/api/investments', authMiddleware, async (req, res) => {
    try {
      console.log('Request body:', req.body);
      console.log('User ID:', req.userId);
      
      const requestData = {
        ...req.body,
        requesterId: req.userId,
      };
      
      console.log('Request data before validation:', requestData);
      
      // Validate only the necessary fields (requestId will be generated in service)
      const validationSchema = insertInvestmentRequestSchema.omit({
        requestId: true,
        currentApprovalStage: true,
        slaDeadline: true,
      });
      
      const validatedData = validationSchema.parse(requestData);
      console.log('Validated data:', validatedData);
      
      const request = await investmentService.createInvestmentRequest(validatedData);
      res.json(request);
    } catch (error) {
      console.error('Investment creation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/investments', authMiddleware, async (req, res) => {
    try {
      const { status, my } = req.query;
      const currentUser = await storage.getUser(req.userId!);
      
      if (!currentUser) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      let requests: any[] = [];
      
      if (currentUser.role === 'analyst') {
        // Analysts see all proposals initiated by them irrespective of status
        const filters: any = { userId: req.userId };
        requests = await storage.getInvestmentRequests(filters);
      } else if (currentUser.role === 'admin') {
        // Admins see all proposals
        const filters: any = {};
        requests = await storage.getInvestmentRequests(filters);
      } else if (['manager', 'committee_member', 'finance'].includes(currentUser.role)) {
        // Manager/Committee/Finance see only proposals they have acted on
        const approvals = await storage.getApprovalsByUser(req.userId!);
        const requestIds = approvals.map(approval => approval.requestId);
        
        if (requestIds.length > 0) {
          const allRequests = await storage.getInvestmentRequests({});
          requests = allRequests.filter(request => requestIds.includes(request.id));
        }
      }
      
      // Apply status filtering after getting the base requests
      if (status) {
        if (status === 'pending') {
          // Pending means not fully approved and not rejected
          requests = requests.filter(request => {
            const requestStatus = request.status.toLowerCase();
            return !requestStatus.includes('approved') && !requestStatus.includes('rejected') && requestStatus !== 'approved';
          });
        } else if (status === 'approved') {
          // Approved means final approval status (only "approved", not partial approvals)
          requests = requests.filter(request => request.status.toLowerCase() === 'approved');
        } else if (status === 'rejected') {
          // Rejected by any approver
          requests = requests.filter(request => {
            const requestStatus = request.status.toLowerCase();
            return requestStatus === 'rejected' || requestStatus.includes('rejected');
          });
        } else {
          // For other statuses, use exact match
          requests = requests.filter(request => request.status === status);
        }
      }
      
      res.json(requests);
    } catch (error) {
      console.error('Error fetching investments:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/investments/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getInvestmentRequest(id);
      
      if (!request) {
        return res.status(404).json({ message: 'Investment request not found' });
      }
      
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/investments/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.userId!;

      // Get the investment request to check its status
      const investment = await storage.getInvestmentRequest(id);
      if (!investment) {
        return res.status(404).json({ message: 'Investment request not found' });
      }

      // Check ownership
      if (investment.requesterId !== userId) {
        return res.status(403).json({ message: 'You can only delete your own investment requests' });
      }

      // Check for existing approvals only for active workflow statuses
      const activeWorkflowStatuses = ['new', 'Manager approved', 'Committee approved', 'Finance approved', 'approved'];
      if (activeWorkflowStatuses.includes(investment.status)) {
        const approvals = await storage.getApprovalsByRequest('investment', id);
        if (approvals.length > 0) {
          return res.status(400).json({ 
            message: 'Cannot delete investment request that is actively in the approval workflow.' 
          });
        }
      }

      const success = await storage.softDeleteInvestmentRequest(id, userId);
      
      if (!success) {
        return res.status(400).json({ 
          message: 'Cannot delete this investment request. It may be in a non-deletable status.' 
        });
      }
      
      res.json({ message: 'Investment request deleted successfully' });
    } catch (error) {
      console.error('Error deleting investment:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Route for submitting draft for approval - placed before the generic PUT route
  app.post('/api/investments/:id/submit', authMiddleware, async (req, res) => {
    try {
      console.log('Submit route called with ID:', req.params.id);
      const id = parseInt(req.params.id);
      const userId = req.userId!;
      
      console.log('Submitting draft request for ID:', id, 'by user:', userId);
      const request = await investmentService.submitDraftRequest(id, userId);
      console.log('Draft submitted successfully:', request);
      res.json(request);
    } catch (error) {
      console.error('Error submitting draft:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' });
    }
  });

  app.put('/api/investments/:id', authMiddleware, async (req, res) => {
    try {
      console.log('Investment update request received:', req.params.id);
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      console.log('Update data:', updateData);
      
      const request = await storage.updateInvestmentRequest(id, updateData);
      console.log('Investment update successful:', request.id);
      res.json(request);
    } catch (error) {
      console.error('Investment update error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Route for modifying rejected requests
  app.put('/api/investments/:id/modify', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const request = await investmentService.modifyInvestmentRequest(id, updateData, req.userId!);
      res.json(request);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });



  // Cash request routes
  app.post('/api/cash-requests', authMiddleware, async (req, res) => {
    try {
      const requestData = insertCashRequestSchema.parse({
        ...req.body,
        requesterId: req.userId,
      });
      
      const request = await investmentService.createCashRequest(requestData);
      res.json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/cash-requests', authMiddleware, async (req, res) => {
    try {
      const { status, my } = req.query;
      const filters: any = {};
      
      if (status) filters.status = status as string;
      if (my === 'true') filters.userId = req.userId;
      
      const requests = await storage.getCashRequests(filters);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/cash-requests/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getCashRequest(id);
      
      if (!request) {
        return res.status(404).json({ message: 'Cash request not found' });
      }
      
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Task routes
  app.get('/api/tasks', authMiddleware, async (req, res) => {
    try {
      const tasks = await storage.getTasksByUser(req.userId!);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const task = await storage.updateTask(id, updateData);
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Approval routes
  app.post('/api/approvals', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId, action, comments } = req.body;
      
      const result = await workflowService.processApproval(
        requestType,
        requestId,
        req.userId!,
        action,
        comments
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/approvals/:requestType/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      const approvals = await storage.getApprovalsByRequest(requestType, parseInt(requestId));
      res.json(approvals);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // New endpoint for current cycle approvals only
  app.get('/api/approvals/:requestType/:requestId/current', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      const approvals = await storage.getCurrentCycleApprovalsByRequest(requestType, parseInt(requestId));
      res.json(approvals);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // New endpoint for all cycle approvals (complete history)
  app.get('/api/approvals/:requestType/:requestId/all', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      const approvals = await storage.getAllCycleApprovalsByRequest(requestType, parseInt(requestId));
      res.json(approvals);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Document routes
  app.post('/api/documents/upload', authMiddleware, fileUpload.array('documents'), async (req, res) => {
    try {
      const { requestType, requestId, categories, categoryId, subcategoryId } = req.body;
      const files = req.files as Express.Multer.File[];
      
      console.log(`Document upload request: ${req.userId}, requestType: ${requestType}, requestId: ${requestId}, files: ${files?.length || 0}`);
      
      if (!files || files.length === 0) {
        console.warn('No files provided in upload request');
        return res.status(400).json({ message: 'No files uploaded' });
      }

      if (!requestType || !requestId) {
        console.warn('Missing required parameters: requestType or requestId');
        return res.status(400).json({ message: 'Missing required parameters: requestType and requestId are required' });
      }
      
      const documents = [];
      const errors = [];
      
      // Process files individually to handle partial failures
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          console.log(`Processing file ${i + 1}/${files.length}: ${file.originalname} (${file.size} bytes)`);
          
          // Validate file
          if (!file.originalname || file.size === 0) {
            throw new Error(`Invalid file: ${file.originalname || 'unknown'}`);
          }
          
          const documentData: any = {
            fileName: file.filename,
            originalName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            fileUrl: file.path,
            uploaderId: req.userId!,
            requestType,
            requestId: parseInt(requestId),
          };
          
          // Legacy support: Add single category information if provided
          if (categoryId) {
            documentData.categoryId = parseInt(categoryId);
          }
          if (subcategoryId) {
            documentData.subcategoryId = parseInt(subcategoryId);
          }
          
          const document = await storage.createDocument(documentData);
          console.log(`Document record created: ${document.id} for file ${file.originalname}`);
          
          // Handle multiple category associations
          if (categories && categories.length > 0) {
            try {
              const categoryList = Array.isArray(categories) ? categories : JSON.parse(categories);
              for (const category of categoryList) {
                await storage.createDocumentCategoryAssociation(
                  document.id,
                  category.categoryId,
                  category.customCategoryName || null
                );
              }
              console.log(`Category associations created for document ${document.id}`);
            } catch (categoryError) {
              console.error(`Failed to create category associations for document ${document.id}:`, categoryError);
              // Continue processing - category associations are not critical
            }
          }
          
          documents.push(document);
          
          // Queue background job for AI processing
          try {
            const currentUser = await storage.getUser(req.userId!);
            if (currentUser) {
              console.log(`Queueing background AI preparation for ${currentUser.role}: ${document.fileName}`);
              await backgroundJobService.addJob({
                jobType: 'prepare-ai',
                documentId: document.id,
                requestType,
                requestId: parseInt(requestId),
                priority: 'high'
              });
              console.log(`Background job queued for document ${document.id}`);
            }
          } catch (backgroundJobError) {
            console.error(`Failed to queue background job for document ${document.id}:`, backgroundJobError);
            // Continue processing - background job failure shouldn't block upload
          }
          
        } catch (fileError) {
          console.error(`Failed to process file ${file.originalname}:`, fileError);
          errors.push({
            fileName: file.originalname,
            error: fileError instanceof Error ? fileError.message : String(fileError)
          });
        }
      }
      
      // If no documents were successfully processed, return error
      if (documents.length === 0) {
        console.error('No documents were successfully processed');
        return res.status(500).json({ 
          message: 'Failed to upload any documents',
          errors 
        });
      }
      
      // If some documents failed, include errors in response but still return success
      const response: any = { 
        documents,
        successful: documents.length,
        total: files.length
      };
      
      if (errors.length > 0) {
        response.errors = errors;
        response.message = `${documents.length}/${files.length} documents uploaded successfully`;
        console.warn(`Partial upload success: ${documents.length}/${files.length} files processed`);
      } else {
        console.log(`All ${documents.length} documents uploaded successfully`);
      }
      
      res.json(response);
    } catch (error) {
      console.error('Document upload system error:', error);
      res.status(500).json({ 
        message: 'Document upload system error',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Investment document upload endpoint
  app.post('/api/documents/investment/:investmentId', authMiddleware, fileUpload.array('documents'), async (req, res) => {
    try {
      console.log('Investment document upload request received:', req.params);
      const { investmentId } = req.params;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }
      
      console.log(`Processing ${files.length} files for investment ${investmentId}`);
      
      const documents = [];
      for (const file of files) {
        console.log(`Creating document record for: ${file.originalname}`);
        const document = await storage.createDocument({
          fileName: file.filename,
          originalName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          fileUrl: file.path,
          uploaderId: req.userId!,
          requestType: 'investment',
          requestId: parseInt(investmentId),
        });
        documents.push(document);
        
        // Queue background job for AI processing
        const currentUser = await storage.getUser(req.userId!);
        if (currentUser) {
          console.log(`Queueing background AI preparation for ${currentUser.role}: ${document.fileName}`);
          await backgroundJobService.addJob({
            jobType: 'prepare-ai',
            documentId: document.id,
            requestType: 'investment',
            requestId: parseInt(investmentId),
            priority: 'high'
          });
        }
      }
      
      console.log(`Successfully processed ${documents.length} documents`);
      res.json(documents);
    } catch (error) {
      console.error('Investment document upload error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Add preview endpoint (must come before the general documents route)
  app.get('/api/documents/preview/:documentId', authMiddleware, async (req, res) => {
    try {
      const { documentId } = req.params;
      console.log('Preview request for document ID:', documentId);
      
      const document = await storage.getDocument(parseInt(documentId));
      console.log('Found document:', document);
      
      if (!document) {
        console.log('Document not found in database');
        return res.status(404).json({ message: 'Document not found' });
      }
      
      const filePath = path.join(process.cwd(), document.fileUrl);
      console.log('Checking file path:', filePath);
      
      // Check if file exists
      try {
        await fs.promises.access(filePath);
      } catch (err) {
        console.log('File does not exist on disk:', filePath);
        return res.status(404).json({ message: 'File not found on server' });
      }
      
      console.log('File exists, preparing preview');
      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', 'inline'); // For preview, not attachment
      
      // Get file stats for proper content length
      const stats = await fs.promises.stat(filePath);
      res.setHeader('Content-Length', stats.size.toString());
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => {
        console.error('File stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error reading file' });
        }
      });
      
      fileStream.pipe(res);
    } catch (error) {
      console.error('Preview error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.get('/api/documents/download/:documentId', authMiddleware, async (req, res) => {
    try {
      const { documentId } = req.params;
      console.log('Download request for document ID:', documentId);
      
      const document = await storage.getDocument(parseInt(documentId));
      console.log('Found document:', document);
      
      if (!document) {
        console.log('Document not found in database');
        return res.status(404).json({ message: 'Document not found' });
      }
      
      const filePath = path.join(process.cwd(), document.fileUrl);
      console.log('Checking file path:', filePath);
      
      // Check if file exists
      try {
        await fs.promises.access(filePath);
      } catch (err) {
        console.log('File does not exist on disk:', filePath);
        return res.status(404).json({ message: 'File not found on server' });
      }
      
      console.log('File exists, preparing download');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.originalName)}"`);
      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      
      // Get file stats for proper content length
      const stats = await fs.promises.stat(filePath);
      res.setHeader('Content-Length', stats.size.toString());
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => {
        console.error('File stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error reading file' });
        }
      });
      
      fileStream.pipe(res);
    } catch (error) {
      console.error('Download error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Delete document endpoint
  app.delete('/api/documents/:documentId', authMiddleware, async (req, res) => {
    try {
      console.log('Delete document request received for ID:', req.params.documentId);
      const { documentId } = req.params;
      const document = await storage.getDocument(parseInt(documentId));
      
      if (!document) {
        console.log(`Document not found in database: ${documentId}`);
        return res.status(404).json({ message: 'Document not found' });
      }
      
      console.log(`Found document to delete: ${document.originalName}`);
      
      // First, delete any related background jobs to avoid foreign key constraint
      await db.delete(backgroundJobs).where(eq(backgroundJobs.documentId, parseInt(documentId)));
      console.log(`Deleted background jobs for document: ${documentId}`);
      
      // Delete the file from disk
      const filePath = path.join(process.cwd(), document.fileUrl);
      try {
        await fs.promises.unlink(filePath);
        console.log(`File deleted from disk: ${filePath}`);
      } catch (error) {
        console.log(`File not found on disk, continuing with database deletion: ${filePath}`);
      }
      
      // Delete from database
      await storage.deleteDocument(parseInt(documentId));
      console.log(`Document deleted from database: ${documentId}`);
      
      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Check document background job status (must come before the general :requestType/:requestId route)
  app.get('/api/documents/:documentId/job-status', authMiddleware, async (req, res) => {
    try {
      const { documentId } = req.params;
      
      // Validate that documentId is a valid integer
      const docId = parseInt(documentId);
      if (isNaN(docId)) {
        return res.status(400).json({ message: 'Invalid document ID' });
      }
      
      // Direct database query to bypass storage method issue
      const jobs = await db
        .select()
        .from(backgroundJobs)
        .where(eq(backgroundJobs.documentId, docId))
        .orderBy(desc(backgroundJobs.createdAt));
      
      if (jobs.length === 0) {
        return res.json({ hasJob: false });
      }
      
      // Get the most recent job
      const latestJob = jobs[0];
      
      res.json({
        hasJob: true,
        job: {
          id: latestJob.id,
          status: latestJob.status,
          jobType: latestJob.jobType,
          currentStep: latestJob.currentStep,
          stepProgress: latestJob.stepProgress,
          totalSteps: latestJob.totalSteps,
          currentStepNumber: latestJob.currentStepNumber,
          createdAt: latestJob.createdAt,
          completedAt: latestJob.completedAt,
          errorMessage: latestJob.errorMessage
        },
        needsManualTrigger: !latestJob || latestJob.status === 'failed'
      });
    } catch (error) {
      console.error('Job status error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get document queries history - MUST come before generic :requestType/:requestId route
  app.get('/api/documents/:documentId/queries', authMiddleware, async (req, res) => {
    try {
      const { documentId } = req.params;
      console.log('Fetching queries for document:', documentId);
      
      // Check if documentId is valid
      if (!documentId || isNaN(parseInt(documentId))) {
        console.error('Invalid document ID:', documentId);
        return res.status(400).json({ message: 'Invalid document ID' });
      }

      const queries = await storage.getDocumentQueries(parseInt(documentId));
      console.log('Found queries:', queries.length);
      res.json(queries);
    } catch (error) {
      console.error('Error getting document queries:', error);
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  });

  // Document analysis endpoint - MUST come before generic :requestType/:requestId route
  app.get('/api/documents/:documentId/analysis', authMiddleware, async (req, res) => {
    try {
      const { documentId } = req.params;
      
      const docId = parseInt(documentId);
      if (isNaN(docId)) {
        return res.status(400).json({ message: 'Invalid document ID' });
      }
      
      const analysis = await storage.getDocumentAnalysis(docId);
      
      if (!analysis) {
        return res.status(404).json({ message: 'Analysis not found' });
      }
      
      res.json(analysis);
    } catch (error) {
      console.error('Error getting document analysis:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/documents/:requestType/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      const documents = await storage.getDocumentsByRequest(requestType, parseInt(requestId));
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Document AI preparation route - Stage 1: Upload to vector store
  app.post('/api/documents/:documentId/prepare-ai', authMiddleware, async (req, res) => {
    try {
      const { documentId } = req.params;
      const document = await storage.getDocument(parseInt(documentId));
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      const filePath = path.join(process.cwd(), 'uploads', document.fileName);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // Import prepare AI service
      const { prepareAIService } = await import('./services/prepareAIService');
      
      // Prepare document for AI analysis
      const result = await prepareAIService.prepareDocumentForAI(
        parseInt(documentId),
        filePath,
        document.fileName
      );
      
      res.json({
        message: result.message,
        success: result.success,
        fileId: result.fileId
      });
      
    } catch (error) {
      console.error('AI preparation failed:', error);
      
      // Update status to failed
      if (req.params.documentId) {
        await storage.updateDocument(parseInt(req.params.documentId), {
          analysisStatus: 'failed'
        });
      }
      
      res.status(500).json({ 
        error: 'AI preparation failed',
        message: error.message 
      });
    }
  });



  // Document AI insights route - Stage 3: Get insights from vector store
  app.post('/api/documents/:documentId/get-insights', authMiddleware, async (req, res) => {
    try {
      const { documentId } = req.params;
      
      // Import get insights service
      const { getInsightsService } = await import('./services/getInsightsService');
      
      // Generate insights for the document
      const result = await getInsightsService.generateInsights(parseInt(documentId));
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          message: 'Failed to generate insights' 
        });
      }
      
      res.json({
        summary: result.summary,
        insights: result.insights,
        success: true
      });
      
    } catch (error) {
      console.error('Get insights failed:', error);
      res.status(500).json({ 
        error: 'Failed to generate insights',
        message: error.message 
      });
    }
  });

  // Document custom query route - allows approvers to ask specific questions
  app.post('/api/documents/:documentId/custom-query', authMiddleware, async (req, res) => {
    try {
      const { documentId } = req.params;
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          error: 'Query is required and must be a string',
          message: 'Invalid query format' 
        });
      }
      
      // Import get insights service to reuse vector store functionality
      const { getInsightsService } = await import('./services/getInsightsService');
      
      // Process custom query for the document
      const result = await getInsightsService.processCustomQuery(parseInt(documentId), query);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          message: 'Failed to process custom query' 
        });
      }
      
      // Save query and response to database
      await storage.saveDocumentQuery({
        documentId: parseInt(documentId),
        userId: req.userId!,
        query,
        response: result.answer
      });
      
      res.json({
        answer: result.answer,
        success: true
      });
      
    } catch (error) {
      console.error('Custom query failed:', error);
      res.status(500).json({ 
        error: 'Failed to process custom query',
        message: error.message 
      });
    }
  });



  app.get('/api/documents/insights/:requestType/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      const insights = await documentAnalysisService.getDocumentInsights(
        requestType, 
        parseInt(requestId)
      );
      
      res.json(insights);
    } catch (error) {
      console.error('Document insights error:', error);
      res.status(500).json({ message: 'Failed to get document insights' });
    }
  });

  // Cross-document query endpoints
  app.post('/api/cross-document-queries', authMiddleware, async (req, res) => {
    try {
      const { requestId, query, documentIds } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          error: 'Query is required and must be a string',
          message: 'Invalid query format' 
        });
      }
      
      if (!requestId || typeof requestId !== 'number') {
        return res.status(400).json({ 
          error: 'Request ID is required and must be a number',
          message: 'Invalid request ID' 
        });
      }
      
      // Import cross-document query service
      const { crossDocumentQueryService } = await import('./services/crossDocumentQueryService');
      
      // Process cross-document query with optional document filtering
      const result = await crossDocumentQueryService.processCrossDocumentQuery(
        'investment', // Default to investment for unified interface
        requestId,
        req.userId!,
        query,
        documentIds
      );
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          message: 'Failed to process cross-document query' 
        });
      }
      
      res.json({
        answer: result.answer,
        documentCount: result.documentCount,
        success: true
      });
      
    } catch (error) {
      console.error('Cross-document query failed:', error);
      res.status(500).json({ 
        error: 'Failed to process cross-document query',
        message: error.message 
      });
    }
  });

  // Legacy cross-document query endpoint for backward compatibility
  app.post('/api/documents/cross-query/:requestType/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          error: 'Query is required and must be a string',
          message: 'Invalid query format' 
        });
      }
      
      // Import cross-document query service
      const { crossDocumentQueryService } = await import('./services/crossDocumentQueryService');
      
      // Process cross-document query without document filtering (legacy behavior)
      const result = await crossDocumentQueryService.processCrossDocumentQuery(
        requestType,
        parseInt(requestId),
        req.userId!,
        query
      );
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          message: 'Failed to process cross-document query' 
        });
      }
      
      res.json({
        answer: result.answer,
        documentCount: result.documentCount,
        success: true
      });
      
    } catch (error) {
      console.error('Cross-document query failed:', error);
      res.status(500).json({ 
        error: 'Failed to process cross-document query',
        message: error.message 
      });
    }
  });

  // Get cross-document queries history for unified interface
  app.get('/api/cross-document-queries/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestId } = req.params;
      
      // Get query history for this request
      const queries = await storage.getCrossDocumentQueries('investment', parseInt(requestId));
      
      res.json(queries);
    } catch (error) {
      console.error('Error getting cross-document queries:', error);
      res.status(500).json({ message: 'Failed to get query history' });
    }
  });

  // Unified Web Search Routes (for UnifiedSearchInterface)
  app.post('/api/web-search-queries', authMiddleware, async (req, res) => {
    try {
      console.log('=== WEB SEARCH API HIT ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('User ID:', req.userId);
      
      const { requestType, requestId, query } = req.body;
      
      if (!requestType || !requestId || !query || typeof query !== 'string') {
        console.log('❌ Validation failed');
        return res.status(400).json({ 
          error: 'Missing required fields: requestType, requestId, query',
          message: 'Invalid request format' 
        });
      }
      
      // Import web search service
      const { webSearchService } = await import('./services/webSearchService');
      
      // Process web search query
      const result = await webSearchService.processWebSearchQuery(
        requestType,
        requestId,
        req.userId!,
        query
      );
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          message: 'Failed to process web search query' 
        });
      }
      
      res.json({
        answer: result.answer,
        responseId: result.responseId,
        success: true
      });
      
    } catch (error) {
      console.error('Web search query failed:', error);
      res.status(500).json({ 
        error: 'Failed to process web search query',
        message: error.message 
      });
    }
  });

  app.get('/api/web-search-queries', authMiddleware, async (req, res) => {
    try {
      const { requestId } = req.query;
      
      if (!requestId) {
        return res.status(400).json({ 
          error: 'Missing requestId parameter',
          message: 'Request ID is required' 
        });
      }
      
      // Get web search query history for this request
      const queries = await storage.getWebSearchQueries('investment_request', parseInt(requestId as string));
      
      // Transform data to match UnifiedSearchInterface format
      const transformedQueries = queries.map(query => ({
        id: query.id,
        query: query.query,
        response: query.response,
        searchType: 'web' as const,
        createdAt: query.createdAt,
        user: query.user
      }));
      
      res.json(transformedQueries);
    } catch (error) {
      console.error('Error getting web search queries:', error);
      res.status(500).json({ message: 'Failed to get web search history' });
    }
  });

  // Delete web search query endpoint
  app.delete('/api/web-search-queries/:queryId', authMiddleware, async (req, res) => {
    try {
      const { queryId } = req.params;
      const queryIdInt = parseInt(queryId);
      
      if (!queryIdInt) {
        return res.status(400).json({ 
          error: 'Invalid query ID',
          message: 'Query ID must be a valid number' 
        });
      }
      
      // Delete the web search query
      const deleted = await storage.deleteWebSearchQuery(queryIdInt, req.userId!);
      
      if (!deleted) {
        return res.status(404).json({ 
          error: 'Query not found',
          message: 'Web search query not found or not authorized to delete' 
        });
      }
      
      res.json({ 
        success: true,
        message: 'Web search query deleted successfully' 
      });
      
    } catch (error) {
      console.error('Error deleting web search query:', error);
      res.status(500).json({ message: 'Failed to delete web search query' });
    }
  });

  // Delete cross-document query endpoint
  app.delete('/api/cross-document-queries/:queryId', authMiddleware, async (req, res) => {
    try {
      const { queryId } = req.params;
      const queryIdInt = parseInt(queryId);
      
      if (!queryIdInt) {
        return res.status(400).json({ 
          error: 'Invalid query ID',
          message: 'Query ID must be a valid number' 
        });
      }
      
      // Delete the cross-document query
      const deleted = await storage.deleteCrossDocumentQuery(queryIdInt, req.userId!);
      
      if (!deleted) {
        return res.status(404).json({ 
          error: 'Query not found',
          message: 'Cross-document query not found or not authorized to delete' 
        });
      }
      
      res.json({ 
        success: true,
        message: 'Cross-document query deleted successfully' 
      });
      
    } catch (error) {
      console.error('Error deleting cross-document query:', error);
      res.status(500).json({ message: 'Failed to delete cross-document query' });
    }
  });

  // Legacy cross-document query history endpoint
  app.get('/api/documents/cross-query/:requestType/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      
      // Get query history for this request
      const queries = await storage.getCrossDocumentQueries(requestType, parseInt(requestId));
      
      res.json(queries);
    } catch (error) {
      console.error('Error getting cross-document queries:', error);
      res.status(500).json({ message: 'Failed to get query history' });
    }
  });

  // Web search query endpoints
  app.post('/api/documents/web-search/:requestType/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          error: 'Query is required and must be a string',
          message: 'Invalid query format' 
        });
      }
      
      // Import web search service
      const { webSearchService } = await import('./services/webSearchService');
      
      // Process web search query
      const result = await webSearchService.processWebSearchQuery(
        requestType,
        parseInt(requestId),
        req.userId!,
        query
      );
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          message: 'Failed to process web search query' 
        });
      }
      
      res.json({
        answer: result.answer,
        success: true
      });
      
    } catch (error) {
      console.error('Web search query failed:', error);
      res.status(500).json({ 
        error: 'Failed to process web search query',
        message: error.message 
      });
    }
  });

  app.get('/api/documents/web-search/:requestType/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      
      // Get web search query history for this request
      const queries = await storage.getWebSearchQueries(requestType, parseInt(requestId));
      
      res.json(queries);
    } catch (error) {
      console.error('Error getting web search queries:', error);
      res.status(500).json({ message: 'Failed to get web search history' });
    }
  });



  app.post('/api/documents/batch-analyze', authMiddleware, async (req, res) => {
    try {
      const { documentIds } = req.body;
      
      if (!Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({ message: 'Invalid document IDs' });
      }
      
      const results = await documentAnalysisService.batchAnalyzeDocuments(documentIds);
      res.json({ 
        message: 'Batch analysis completed', 
        results,
        total: results.length 
      });
    } catch (error) {
      console.error('Batch analysis error:', error);
      res.status(500).json({ message: 'Batch analysis failed' });
    }
  });

  app.get('/api/documents/pending-analysis', authMiddleware, async (req, res) => {
    try {
      const pendingDocuments = await storage.getDocumentsByAnalysisStatus('pending');
      res.json(pendingDocuments);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get all documents for analytics
  app.get('/api/documents/all', authMiddleware, async (req, res) => {
    try {
      // Get all documents from storage
      const allDocuments = await db.select().from(documents);
      res.json(allDocuments);
    } catch (error) {
      console.error('Error fetching all documents:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Force complete stuck processing documents
  app.post('/api/documents/force-complete', authMiddleware, async (req, res) => {
    try {
      // Update documents stuck in processing to completed
      const processingDocuments = await db.select().from(documents)
        .where(eq(documents.analysisStatus, 'processing'));
      
      for (const doc of processingDocuments) {
        await storage.updateDocument(doc.id, {
          analysisStatus: 'completed',
          analyzedAt: new Date()
        });
      }
      
      res.json({ 
        message: 'Forced completion of stuck documents',
        count: processingDocuments.length 
      });
    } catch (error) {
      console.error('Error forcing document completion:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Approval routes
  app.get('/api/approvals/:requestType/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      const requestIdNumber = parseInt(requestId);
      
      if (isNaN(requestIdNumber)) {
        return res.status(400).json({ error: 'Invalid request ID' });
      }
      
      const approvals = await storage.getApprovalsByRequest(requestType, requestIdNumber);
      res.json(approvals);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      res.status(500).json({ error: 'Failed to fetch approvals' });
    }
  });

  // Notification routes
  app.get('/api/notifications', authMiddleware, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.userId!);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.patch('/api/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/notifications/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteNotification(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Text Enhancement API
  app.post('/api/text/enhance', authMiddleware, async (req, res) => {
    try {
      const { text, type } = req.body;
      
      if (!text || !text.trim()) {
        return res.status(400).json({ message: 'Text is required' });
      }
      
      if (!['professional', 'grammar', 'clarity', 'rewrite'].includes(type)) {
        return res.status(400).json({ message: 'Invalid enhancement type' });
      }
      
      const enhancedText = await enhanceText(text, type as EnhancementType);
      res.json({ enhancedText });
    } catch (error) {
      console.error('Text enhancement error:', error);
      res.status(500).json({ message: 'Failed to enhance text' });
    }
  });

  // Template routes
  app.get('/api/templates/:type', authMiddleware, async (req, res) => {
    try {
      const { type } = req.params;
      const templates = await storage.getTemplatesByType(type);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/templates/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getTemplate(id);
      
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Vector Store routes
  app.post('/api/vector-store/upload/:documentId', authMiddleware, async (req, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      const filePath = path.join(process.cwd(), 'uploads', document.fileName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found on disk' });
      }
      
      const result = await vectorStoreService.uploadDocumentToVectorStore(documentId, filePath);
      res.json({ 
        message: 'Document uploaded to vector store successfully',
        vectorStoreDocument: result 
      });
    } catch (error) {
      console.error('Vector store upload error:', error);
      res.status(500).json({ message: error.message || 'Failed to upload to vector store' });
    }
  });

  app.post('/api/vector-store/batch-upload', authMiddleware, async (req, res) => {
    try {
      const { documentIds } = req.body;
      
      if (!Array.isArray(documentIds)) {
        return res.status(400).json({ message: 'documentIds must be an array' });
      }
      
      const results = await vectorStoreService.batchUploadDocuments(documentIds);
      res.json({ 
        message: `Uploaded ${results.length} documents to vector store`,
        vectorStoreDocuments: results 
      });
    } catch (error) {
      console.error('Vector store batch upload error:', error);
      res.status(500).json({ message: error.message || 'Failed to batch upload to vector store' });
    }
  });

  app.post('/api/vector-store/query', authMiddleware, async (req, res) => {
    try {
      const { query, vectorStoreId, fileId, limit } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: 'Query is required' });
      }
      
      const results = await vectorStoreService.queryVectorStore({
        query,
        vectorStoreId,
        fileId,
        limit
      });
      
      res.json({ 
        message: 'Query executed successfully',
        results 
      });
    } catch (error) {
      console.error('Vector store query error:', error);
      res.status(500).json({ message: error.message || 'Failed to query vector store' });
    }
  });

  app.post('/api/vector-store/query-document/:fileId', authMiddleware, async (req, res) => {
    try {
      const { fileId } = req.params;
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: 'Query is required' });
      }
      
      const results = await vectorStoreService.querySpecificDocument(fileId, query);
      res.json({ 
        message: 'Document query executed successfully',
        results 
      });
    } catch (error) {
      console.error('Document query error:', error);
      res.status(500).json({ message: error.message || 'Failed to query document' });
    }
  });

  app.get('/api/vector-store/info/:vectorStoreId?', authMiddleware, async (req, res) => {
    try {
      const { vectorStoreId } = req.params;
      const info = await vectorStoreService.getVectorStoreInfo(vectorStoreId);
      res.json(info);
    } catch (error) {
      console.error('Vector store info error:', error);
      res.status(500).json({ message: error.message || 'Failed to get vector store info' });
    }
  });

  app.get('/api/vector-store/files/:vectorStoreId?', authMiddleware, async (req, res) => {
    try {
      const { vectorStoreId } = req.params;
      const files = await vectorStoreService.listVectorStoreFiles(vectorStoreId);
      res.json(files);
    } catch (error) {
      console.error('Vector store files error:', error);
      res.status(500).json({ message: error.message || 'Failed to list vector store files' });
    }
  });

  app.delete('/api/vector-store/file/:fileId', authMiddleware, async (req, res) => {
    try {
      const { fileId } = req.params;
      const { vectorStoreId } = req.body;
      
      await vectorStoreService.deleteDocumentFromVectorStore(fileId, vectorStoreId);
      res.json({ message: 'Document deleted from vector store successfully' });
    } catch (error) {
      console.error('Vector store delete error:', error);
      res.status(500).json({ message: error.message || 'Failed to delete document from vector store' });
    }
  });

  // Document category API routes
  app.get('/api/document-categories', authMiddleware, async (req, res) => {
    try {
      const categories = await storage.getDocumentCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching document categories:', error);
      res.status(500).json({ error: 'Failed to fetch document categories' });
    }
  });

  // Legacy route removed - subcategories no longer used

  app.post('/api/document-categories', authMiddleware, async (req, res) => {
    try {
      const { name, description, icon = '📄' } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const category = await storage.createDocumentCategory({
        name,
        description,
        icon,
        isSystem: false,
        isActive: true
      });
      
      res.json(category);
    } catch (error) {
      console.error('Error creating document category:', error);
      res.status(500).json({ error: 'Failed to create document category' });
    }
  });

  // Multiple categories per document routes
  app.post('/api/documents/:documentId/categories', authMiddleware, async (req, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      const { categoryId, customCategoryName } = req.body;
      
      if (!categoryId) {
        return res.status(400).json({ error: 'Category ID is required' });
      }

      const association = await storage.createDocumentCategoryAssociation(
        documentId,
        parseInt(categoryId),
        customCategoryName
      );
      
      res.json(association);
    } catch (error) {
      console.error('Error creating document category association:', error);
      res.status(500).json({ error: 'Failed to add category to document' });
    }
  });

  app.get('/api/documents/:documentId/categories', authMiddleware, async (req, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      const associations = await storage.getDocumentCategoryAssociations(documentId);
      res.json(associations);
    } catch (error) {
      console.error('Error fetching document categories:', error);
      res.status(500).json({ error: 'Failed to fetch document categories' });
    }
  });

  app.delete('/api/documents/:documentId/categories/:categoryId', authMiddleware, async (req, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      const categoryId = parseInt(req.params.categoryId);
      
      await storage.deleteDocumentCategoryAssociation(documentId, categoryId);
      res.json({ message: 'Category removed from document successfully' });
    } catch (error) {
      console.error('Error removing document category:', error);
      res.status(500).json({ error: 'Failed to remove category from document' });
    }
  });

  // New Web Search endpoint as requested - POST /api/search/web
  app.post('/api/search/web', authMiddleware, async (req, res) => {
    try {
      console.log('=== POST /api/search/web ENDPOINT HIT ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('User ID:', req.userId);
      
      const { requestId, query } = req.body;
      
      if (!requestId || !query || typeof query !== 'string') {
        console.log('❌ Validation failed - missing requestId or query');
        return res.status(400).json({ 
          error: 'Missing required fields: requestId, query',
          message: 'Invalid request format' 
        });
      }
      
      // Import web search service
      const { webSearchService } = await import('./services/webSearchService');
      
      // Process web search query using investment_request as default type
      const result = await webSearchService.processWebSearchQuery(
        'investment_request',
        parseInt(requestId),
        req.userId!,
        query
      );
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          message: 'Failed to process web search query' 
        });
      }
      
      console.log('✅ Web search successful');
      res.json({
        answer: result.answer,
        responseId: result.responseId,
        success: true
      });
      
    } catch (error) {
      console.error('❌ POST /api/search/web failed:', error);
      res.status(500).json({ 
        error: 'Failed to process web search query',
        message: error.message 
      });
    }
  });

  // Template CRUD routes
  app.post('/api/templates', authMiddleware, async (req, res) => {
    try {
      const templateData = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate({
        ...templateData,
        createdBy: req.userId!,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      res.json(template);
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({ message: 'Failed to create template' });
    }
  });

  app.put('/api/templates/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertTemplateSchema.partial().parse(req.body);
      const template = await storage.updateTemplate(id, {
        ...updateData,
        updatedAt: new Date()
      });
      res.json(template);
    } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({ message: 'Failed to update template' });
    }
  });

  app.delete('/api/templates/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTemplate(id);
      res.json({ message: 'Template deleted successfully' });
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({ message: 'Failed to delete template' });
    }
  });

  // Investment rationale routes
  app.get('/api/investments/:id/rationales', authMiddleware, async (req, res) => {
    try {
      const investmentId = parseInt(req.params.id);
      const rationales = await storage.getInvestmentRationales(investmentId);
      res.json(rationales);
    } catch (error) {
      console.error('Error fetching rationales:', error);
      res.status(500).json({ message: 'Failed to fetch rationales' });
    }
  });

  app.post('/api/investments/:id/rationales', authMiddleware, async (req, res) => {
    try {
      const investmentId = parseInt(req.params.id);
      const rationaleData = insertInvestmentRationaleSchema.parse({
        ...req.body,
        investmentId,
        authorId: req.userId!
      });
      
      const rationale = await storage.createInvestmentRationale(rationaleData);
      res.json(rationale);
    } catch (error) {
      console.error('Error creating rationale:', error);
      res.status(500).json({ message: 'Failed to create rationale' });
    }
  });

  app.put('/api/investments/:id/rationales/:rationaleId', authMiddleware, async (req, res) => {
    try {
      const rationaleId = parseInt(req.params.rationaleId);
      const updateData = {
        content: req.body.content
      };
      
      const rationale = await storage.updateInvestmentRationale(rationaleId, updateData);
      res.json(rationale);
    } catch (error) {
      console.error('Error updating rationale:', error);
      res.status(500).json({ message: 'Failed to update rationale' });
    }
  });

  app.delete('/api/investments/:id/rationales/:rationaleId', authMiddleware, async (req, res) => {
    try {
      const rationaleId = parseInt(req.params.rationaleId);
      await storage.deleteInvestmentRationale(rationaleId);
      res.json({ message: 'Rationale deleted successfully' });
    } catch (error) {
      console.error('Error deleting rationale:', error);
      res.status(500).json({ message: 'Failed to delete rationale' });
    }
  });

  // AI rationale generation route
  app.post('/api/investments/:id/rationales/generate', authMiddleware, async (req, res) => {
    try {
      const investmentId = parseInt(req.params.id);
      const { templateId } = req.body;
      
      // Get template and investment details
      const template = await storage.getTemplate(templateId);
      const investment = await storage.getInvestmentRequest(investmentId);
      
      if (!template || !investment) {
        return res.status(404).json({ message: 'Template or investment not found' });
      }
      
      // For now, create a placeholder AI-generated rationale
      // In production, this would integrate with the LLM service
      const aiContent = `AI-Generated Investment Rationale for ${investment.targetCompany}

This analysis is generated using the "${template.name}" template for ${investment.investmentType} investments.

Investment Overview:
- Target Company: ${investment.targetCompany}
- Investment Amount: $${parseFloat(investment.amount).toLocaleString()}
- Expected Return: ${investment.expectedReturn}%
- Risk Level: ${investment.riskLevel}

Financial Analysis:
Based on the provided investment parameters, this ${investment.investmentType} investment in ${investment.targetCompany} presents a balanced opportunity with expected returns of ${investment.expectedReturn}%. The risk profile is classified as ${investment.riskLevel}, indicating appropriate due diligence requirements.

Risk Assessment:
The investment carries ${investment.riskLevel} risk characteristics. Key risk factors include market volatility, sector-specific challenges, and regulatory considerations. Mitigation strategies should be implemented accordingly.

Investment Recommendation:
This investment aligns with portfolio diversification objectives and meets the return threshold requirements. The risk-adjusted return profile justifies the allocation of $${parseFloat(investment.amount).toLocaleString()}.

Strategic Fit:
The investment supports long-term portfolio growth objectives and provides exposure to the ${investment.investmentType} asset class.

Note: This is an AI-generated analysis based on the selected template structure. For production deployment, this would integrate with advanced LLM services for comprehensive market analysis and detailed financial modeling.`;

      const rationaleData = {
        investmentId,
        templateId,
        content: aiContent,
        type: 'ai_generated' as const,
        authorId: req.userId!,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const rationale = await storage.createInvestmentRationale(rationaleData);
      res.json(rationale);
    } catch (error) {
      console.error('Error generating AI rationale:', error);
      res.status(500).json({ message: 'Failed to generate AI rationale' });
    }
  });

  // Comprehensive AI rationale generation route
  app.post('/api/investments/:id/rationales/generate-comprehensive', authMiddleware, async (req, res) => {
    try {
      const investmentId = parseInt(req.params.id);
      const { templateId } = req.body;
      
      // Import the service
      const { comprehensiveProposalService } = await import('./services/comprehensiveProposalService');
      
      // Generate comprehensive proposal
      const result = await comprehensiveProposalService.generateComprehensiveProposal({
        investmentId,
        templateId,
        userId: req.userId!
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error generating comprehensive proposal:', error);
      res.status(500).json({ 
        message: 'Failed to generate comprehensive proposal',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
