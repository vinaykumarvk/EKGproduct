import { 
  users, investmentRequests, cashRequests, approvals, tasks, documents, 
  documentCategories, documentCategoryAssociations,
  notifications, templates, auditLogs, approvalWorkflows, backgroundJobs,
  documentQueries, crossDocumentQueries, webSearchQueries, sequences, investmentRationales,
  type User, type InsertUser, type InvestmentRequest, type InsertInvestmentRequest,
  type CashRequest, type InsertCashRequest, type Approval, type InsertApproval,
  type Task, type InsertTask, type Document, type InsertDocument,
  type DocumentCategory, type InsertDocumentCategory,
  type Notification, type InsertNotification, type Template, type InsertTemplate,
  type BackgroundJob, type InsertBackgroundJob, type DocumentQuery, type InsertDocumentQuery,
  type CrossDocumentQuery, type InsertCrossDocumentQuery, type WebSearchQuery, type InsertWebSearchQuery,
  type Sequence, type InsertSequence, type InvestmentRationale, type InsertInvestmentRationale
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, ne, isNotNull, max } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  
  // Investment operations
  getInvestmentRequest(id: number): Promise<InvestmentRequest | undefined>;
  getInvestmentRequestByRequestId(requestId: string): Promise<InvestmentRequest | undefined>;
  createInvestmentRequest(request: InsertInvestmentRequest): Promise<InvestmentRequest>;
  updateInvestmentRequest(id: number, request: Partial<InsertInvestmentRequest>): Promise<InvestmentRequest>;
  getInvestmentRequests(filters?: { userId?: number; status?: string }): Promise<InvestmentRequest[]>;
  softDeleteInvestmentRequest(id: number, userId: number): Promise<boolean>;
  
  // Cash request operations
  getCashRequest(id: number): Promise<CashRequest | undefined>;
  getCashRequestByRequestId(requestId: string): Promise<CashRequest | undefined>;
  createCashRequest(request: InsertCashRequest): Promise<CashRequest>;
  updateCashRequest(id: number, request: Partial<InsertCashRequest>): Promise<CashRequest>;
  getCashRequests(filters?: { userId?: number; status?: string }): Promise<CashRequest[]>;
  
  // Approval operations
  createApproval(approval: InsertApproval): Promise<Approval>;
  updateApproval(id: number, approval: Partial<InsertApproval>): Promise<Approval>;
  deleteApproval(id: number): Promise<void>;
  getApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]>;
  getCurrentCycleApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]>;
  getAllCycleApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]>;
  getApprovalsByUser(userId: number): Promise<Approval[]>;
  markPreviousCycleApprovalsAsInactive(requestType: string, requestId: number): Promise<void>;
  incrementApprovalCycle(requestType: string, requestId: number): Promise<number>;
  
  // Task operations
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  getTasksByUser(userId: number): Promise<Task[]>;
  getTaskById(id: number): Promise<Task | undefined>;
  
  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
  getDocumentsByRequest(requestType: string, requestId: number): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByAnalysisStatus(status: string): Promise<Document[]>;
  getDocumentAnalysis(id: number): Promise<any>;
  
  // Document category operations
  getDocumentCategories(): Promise<DocumentCategory[]>;
  createDocumentCategory(category: InsertDocumentCategory): Promise<DocumentCategory>;
  getDocumentsByCategory(categoryId?: number): Promise<Document[]>;
  
  // Multiple categories per document operations
  createDocumentCategoryAssociation(documentId: number, categoryId: number, customCategoryName?: string): Promise<any>;
  getDocumentCategoryAssociations(documentId: number): Promise<any[]>;
  deleteDocumentCategoryAssociation(documentId: number, categoryId: number): Promise<void>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<void>;
  deleteNotification(id: number): Promise<void>;
  
  // Template operations
  createTemplate(template: InsertTemplate): Promise<Template>;
  getTemplatesByType(type: string): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;
  deleteTemplate(id: number): Promise<void>;
  
  // Investment rationale operations
  createInvestmentRationale(rationale: InsertInvestmentRationale): Promise<InvestmentRationale>;
  getInvestmentRationales(investmentId: number): Promise<InvestmentRationale[]>;
  updateInvestmentRationale(id: number, rationale: Partial<InsertInvestmentRationale>): Promise<InvestmentRationale>;
  deleteInvestmentRationale(id: number): Promise<void>;
  
  // Audit trail operations
  getCurrentCycleApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]>;
  getAllCycleApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]>;
  incrementApprovalCycle(requestType: string, requestId: number): Promise<number>;
  
  // Dashboard stats
  getDashboardStats(userId: number): Promise<{
    pendingApprovals: number;
    activeInvestments: number;
    cashRequests: number;
    slaBreaches: number;
  }>;

  // Enhanced dashboard metrics
  getEnhancedDashboardStats(userId: number): Promise<{
    proposalSummary: {
      investment: {
        draft: { count: number; value: number };
        pendingManager: { count: number; value: number };
        pendingCommittee: { count: number; value: number };
        pendingFinance: { count: number; value: number };
        approved: { count: number; value: number };
        rejected: { count: number; value: number };
        total: { count: number; value: number };
      };
      cash: {
        draft: { count: number; value: number };
        pendingManager: { count: number; value: number };
        pendingCommittee: { count: number; value: number };
        pendingFinance: { count: number; value: number };
        approved: { count: number; value: number };
        rejected: { count: number; value: number };
        total: { count: number; value: number };
      };
    };
    riskProfile: {
      low: { count: number; value: number };
      medium: { count: number; value: number };
      high: { count: number; value: number };
    };
    valueDistribution: {
      small: { count: number; value: number }; // 0-1M
      medium: { count: number; value: number }; // 1-5M
      large: { count: number; value: number }; // 5-10M
      extraLarge: { count: number; value: number }; // 10M+
    };
    decisionSupport: {
      urgentApprovals: number;
      overdueItems: number;
      avgProcessingTime: number;
      complianceAlerts: number;
    };
  }>;
  
  // Recent requests
  getRecentRequests(limit?: number, userId?: number): Promise<Array<{
    id: number;
    requestId: string;
    type: 'investment' | 'cash_request';
    amount: string;
    status: string;
    createdAt: Date;
    requester: { firstName: string; lastName: string };
  }>>;
  
  // Background job operations
  createBackgroundJob(job: InsertBackgroundJob): Promise<BackgroundJob>;
  getBackgroundJobsByDocument(documentId: number): Promise<BackgroundJob[]>;
  getBackgroundJob(id: number): Promise<BackgroundJob | undefined>;
  updateBackgroundJob(id: number, job: Partial<InsertBackgroundJob>): Promise<BackgroundJob>;

  // Document query operations
  saveDocumentQuery(query: InsertDocumentQuery): Promise<DocumentQuery>;
  getDocumentQueries(documentId: number): Promise<any[]>;
  
  // Cross-document query operations
  saveCrossDocumentQuery(query: InsertCrossDocumentQuery): Promise<CrossDocumentQuery>;
  getCrossDocumentQueries(requestType: string, requestId: number): Promise<CrossDocumentQuery[]>;
  getLastResponseId(requestType: string, requestId: number, userId: number): Promise<string | null>;
  
  // Web search query operations
  saveWebSearchQuery(query: InsertWebSearchQuery): Promise<WebSearchQuery>;
  getWebSearchQueries(requestType: string, requestId: number): Promise<WebSearchQuery[]>;
  getLastWebSearchResponseId(requestType: string, requestId: number, userId: number): Promise<string | null>;
  
  // Sequence operations
  getNextSequenceValue(sequenceName: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updateUser: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updateUser).where(eq(users.id, id)).returning();
    return user;
  }

  async getInvestmentRequest(id: number): Promise<InvestmentRequest | undefined> {
    const [request] = await db.select().from(investmentRequests).where(
      and(
        eq(investmentRequests.id, id),
        sql`${investmentRequests.deletedAt} IS NULL`
      )
    );
    return request || undefined;
  }

  async getInvestmentRequestByRequestId(requestId: string): Promise<InvestmentRequest | undefined> {
    const [request] = await db.select().from(investmentRequests).where(
      and(
        eq(investmentRequests.requestId, requestId),
        sql`${investmentRequests.deletedAt} IS NULL`
      )
    );
    return request || undefined;
  }

  async createInvestmentRequest(request: InsertInvestmentRequest): Promise<InvestmentRequest> {
    const [created] = await db.insert(investmentRequests).values(request).returning();
    return created;
  }

  async updateInvestmentRequest(id: number, request: Partial<InsertInvestmentRequest>): Promise<InvestmentRequest> {
    const [updated] = await db.update(investmentRequests).set(request).where(eq(investmentRequests.id, id)).returning();
    return updated;
  }

  async softDeleteInvestmentRequest(id: number, userId: number): Promise<boolean> {
    try {
      // Get the request without the deletedAt filter to check current state
      const [request] = await db.select().from(investmentRequests).where(eq(investmentRequests.id, id));
      if (!request || request.requesterId !== userId) {
        return false;
      }

      // Check if already deleted
      if (request.deletedAt) {
        return false; // Already deleted
      }

      // Check if the request can be deleted (business rules)
      const canDelete = this.canDeleteInvestmentRequest(request.status);
      if (!canDelete) {
        return false;
      }

      // Soft delete by setting deletedAt timestamp
      await db.update(investmentRequests)
        .set({ deletedAt: new Date() })
        .where(eq(investmentRequests.id, id));
      
      // Clean up related tasks - mark them as completed
      await db.update(tasks)
        .set({ 
          status: 'completed', 
          completedAt: new Date() 
        })
        .where(
          and(
            eq(tasks.requestType, 'investment'),
            eq(tasks.requestId, id),
            eq(tasks.status, 'pending')
          )
        );
      
      return true;
    } catch (error) {
      console.error('Error soft deleting investment request:', error);
      return false;
    }
  }

  private canDeleteInvestmentRequest(status: string): boolean {
    // Define which statuses allow deletion
    const deletableStatuses = ['draft', 'rejected', 'admin_rejected', 'changes_requested', 'opportunity'];
    
    // Allow deletion of pending requests only if no approvals have started
    if (status === 'new') {
      return true; // We'll check for approvals in the API layer
    }
    
    return deletableStatuses.includes(status);
  }

  async getInvestmentRequests(filters?: { userId?: number; status?: string }): Promise<InvestmentRequest[]> {
    let query = db.select().from(investmentRequests);
    
    const conditions: any[] = [];
    
    // Always filter out soft-deleted records
    conditions.push(sql`${investmentRequests.deletedAt} IS NULL`);
    
    if (filters?.userId) {
      conditions.push(eq(investmentRequests.requesterId, filters.userId));
    }
    
    if (filters?.status) {
      conditions.push(eq(investmentRequests.status, filters.status));
    }
    
    query = query.where(and(...conditions));
    
    const results = await query.orderBy(desc(investmentRequests.createdAt));
    return results;
  }

  async getCashRequest(id: number): Promise<CashRequest | undefined> {
    const [request] = await db.select().from(cashRequests).where(eq(cashRequests.id, id));
    return request || undefined;
  }

  async getCashRequestByRequestId(requestId: string): Promise<CashRequest | undefined> {
    const [request] = await db.select().from(cashRequests).where(eq(cashRequests.requestId, requestId));
    return request || undefined;
  }

  async createCashRequest(request: InsertCashRequest): Promise<CashRequest> {
    const [created] = await db.insert(cashRequests).values(request).returning();
    return created;
  }

  async updateCashRequest(id: number, request: Partial<InsertCashRequest>): Promise<CashRequest> {
    const [updated] = await db.update(cashRequests).set(request).where(eq(cashRequests.id, id)).returning();
    return updated;
  }

  async getCashRequests(filters?: { userId?: number; status?: string }): Promise<CashRequest[]> {
    let query = db.select().from(cashRequests);
    
    const conditions: any[] = [];
    
    if (filters?.userId) {
      conditions.push(eq(cashRequests.requesterId, filters.userId));
    }
    
    if (filters?.status) {
      conditions.push(eq(cashRequests.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }
    
    const results = await query.orderBy(desc(cashRequests.createdAt));
    return results;
  }

  async createApproval(approval: InsertApproval): Promise<Approval> {
    const [created] = await db.insert(approvals).values(approval).returning();
    return created;
  }

  async updateApproval(id: number, approval: Partial<InsertApproval>): Promise<Approval> {
    const [updated] = await db.update(approvals).set(approval).where(eq(approvals.id, id)).returning();
    return updated;
  }

  async deleteApproval(id: number): Promise<void> {
    await db.delete(approvals).where(eq(approvals.id, id));
  }

  async getApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]> {
    return await db.select().from(approvals)
      .where(and(
        eq(approvals.requestType, requestType),
        eq(approvals.requestId, requestId)
      ))
      .orderBy(approvals.stage);
  }

  async getCurrentCycleApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]> {
    return await db.select().from(approvals)
      .where(and(
        eq(approvals.requestType, requestType),
        eq(approvals.requestId, requestId),
        eq(approvals.isCurrentCycle, true)
      ))
      .orderBy(approvals.stage);
  }

  async getAllCycleApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]> {
    return await db.select().from(approvals)
      .where(and(
        eq(approvals.requestType, requestType),
        eq(approvals.requestId, requestId)
      ))
      .orderBy(desc(approvals.approvalCycle), approvals.stage);
  }

  async markPreviousCycleApprovalsAsInactive(requestType: string, requestId: number): Promise<void> {
    await db.update(approvals)
      .set({ isCurrentCycle: false })
      .where(and(
        eq(approvals.requestType, requestType),
        eq(approvals.requestId, requestId),
        eq(approvals.isCurrentCycle, true)
      ));
  }

  async incrementApprovalCycle(requestType: string, requestId: number): Promise<number> {
    // First mark previous cycle as inactive
    await this.markPreviousCycleApprovalsAsInactive(requestType, requestId);
    
    // Get the maximum cycle number for this request
    const [maxCycle] = await db.select({ 
      maxCycle: sql<number>`COALESCE(MAX(${approvals.approvalCycle}), 0)` 
    })
    .from(approvals)
    .where(and(
      eq(approvals.requestType, requestType),
      eq(approvals.requestId, requestId)
    ));
    
    const newCycle = (maxCycle?.maxCycle || 0) + 1;
    
    // Update the investment request's current cycle
    if (requestType === 'investment') {
      await db.update(investmentRequests)
        .set({ currentApprovalCycle: newCycle })
        .where(eq(investmentRequests.id, requestId));
    }
    
    return newCycle;
  }

  async getApprovalsByUser(userId: number): Promise<Approval[]> {
    return await db.select().from(approvals)
      .where(eq(approvals.approverId, userId))
      .orderBy(desc(approvals.createdAt));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task> {
    const [updated] = await db.update(tasks).set(task).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async getTasksByUser(userId: number): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(eq(tasks.assigneeId, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksByRequest(requestType: string, requestId: number): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(and(
        eq(tasks.requestType, requestType),
        eq(tasks.requestId, requestId)
      ))
      .orderBy(desc(tasks.createdAt));
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(document).returning();
    return created;
  }

  async getDocumentsByRequest(requestType: string, requestId: number): Promise<Document[]> {
    return await db.select().from(documents)
      .where(and(
        eq(documents.requestType, requestType),
        eq(documents.requestId, requestId)
      ))
      .orderBy(desc(documents.createdAt));
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document> {
    const [updated] = await db.update(documents).set(document).where(eq(documents.id, id)).returning();
    return updated;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async getDocumentsByAnalysisStatus(status: string): Promise<Document[]> {
    return await db.select().from(documents)
      .where(eq(documents.analysisStatus, status))
      .orderBy(desc(documents.createdAt));
  }

  async getDocumentAnalysis(id: number): Promise<any> {
    const document = await this.getDocument(id);
    
    if (!document || !document.analysisResult) {
      return null;
    }
    
    try {
      return JSON.parse(document.analysisResult);
    } catch (error) {
      console.error('Failed to parse document analysis:', error);
      return null;
    }
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async deleteNotification(id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [created] = await db.insert(templates).values(template).returning();
    return created;
  }

  async getTemplatesByType(type: string): Promise<Template[]> {
    return await db.select().from(templates)
      .where(and(eq(templates.type, type), eq(templates.isActive, true)))
      .orderBy(desc(templates.createdAt));
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template || undefined;
  }

  async getDashboardStats(userId: number): Promise<{
    pendingApprovals: number;
    activeInvestments: number;
    cashRequests: number;
    slaBreaches: number;
  }> {
    const [pendingApprovals] = await db.select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, userId), eq(tasks.status, 'pending')));

    const [activeInvestments] = await db.select({ count: sql<number>`count(*)` })
      .from(investmentRequests)
      .where(eq(investmentRequests.status, 'approved'));

    const [cashRequestsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(cashRequests)
      .where(eq(cashRequests.status, 'pending'));

    const [slaBreaches] = await db.select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(eq(tasks.status, 'overdue')));

    return {
      pendingApprovals: pendingApprovals.count,
      activeInvestments: activeInvestments.count,
      cashRequests: cashRequestsCount.count,
      slaBreaches: slaBreaches.count,
    };
  }

  async getEnhancedDashboardStats(userId: number): Promise<{
    proposalSummary: {
      investment: {
        draft: { count: number; value: number };
        pendingManager: { count: number; value: number };
        pendingCommittee: { count: number; value: number };
        pendingFinance: { count: number; value: number };
        approved: { count: number; value: number };
        rejected: { count: number; value: number };
        total: { count: number; value: number };
      };
      cash: {
        draft: { count: number; value: number };
        pendingManager: { count: number; value: number };
        pendingCommittee: { count: number; value: number };
        pendingFinance: { count: number; value: number };
        approved: { count: number; value: number };
        rejected: { count: number; value: number };
        total: { count: number; value: number };
      };
    };
    riskProfile: {
      low: { count: number; value: number };
      medium: { count: number; value: number };
      high: { count: number; value: number };
    };
    valueDistribution: {
      small: { count: number; value: number }; // 0-1M
      medium: { count: number; value: number }; // 1-5M
      large: { count: number; value: number }; // 5-10M
      extraLarge: { count: number; value: number }; // 10M+
    };
    decisionSupport: {
      urgentApprovals: number;
      overdueItems: number;
      avgProcessingTime: number;
      complianceAlerts: number;
    };
  }> {
    try {
      // Get current user to determine role-based filtering
      const currentUser = await this.getUser(userId);
      const userRole = currentUser?.role;
      
      // Use existing working methods to get basic data with role-based filtering
      let investmentData = [];
      let cashData = [];
      
      if (userRole === 'analyst') {
        // Analysts can only see their own proposals
        investmentData = await this.getInvestmentRequests({ userId: userId });
        cashData = await this.getCashRequests({ userId: userId });
      } else {
        // Managers, committee members, finance, and admin can see all non-draft proposals
        investmentData = await this.getInvestmentRequests();
        cashData = await this.getCashRequests();
        
        // Filter out draft proposals for non-analysts (except admin)
        if (userRole !== 'admin') {
          investmentData = investmentData.filter(item => item.status !== 'draft');
          cashData = cashData.filter(item => item.status !== 'draft');
        }
      }

      // Process investment proposal statistics
      const investmentStats = this.processProposalStats(investmentData, 'investment');
      const cashStats = this.processProposalStats(cashData, 'cash');

      // Process risk profile distribution
      const riskStats = this.processRiskProfileStats(investmentData);

      // Process value distribution
      const valueStats = this.processValueDistributionStats(investmentData);

      // Get decision support metrics
      const decisionStats = await this.getDecisionSupportStats(userId, userRole);

      return {
        proposalSummary: {
          investment: investmentStats,
          cash: cashStats,
        },
        riskProfile: riskStats,
        valueDistribution: valueStats,
        decisionSupport: decisionStats,
      };
    } catch (error) {
      console.error('Error in getEnhancedDashboardStats:', error);
      
      // Return default/empty stats on error
      return {
        proposalSummary: {
          investment: {
            draft: { count: 0, value: 0 },
            pendingManager: { count: 0, value: 0 },
            pendingCommittee: { count: 0, value: 0 },
            pendingFinance: { count: 0, value: 0 },
            approved: { count: 0, value: 0 },
            rejected: { count: 0, value: 0 },
            total: { count: 0, value: 0 },
          },
          cash: {
            draft: { count: 0, value: 0 },
            pendingManager: { count: 0, value: 0 },
            pendingCommittee: { count: 0, value: 0 },
            pendingFinance: { count: 0, value: 0 },
            approved: { count: 0, value: 0 },
            rejected: { count: 0, value: 0 },
            total: { count: 0, value: 0 },
          },
        },
        riskProfile: {
          low: { count: 0, value: 0 },
          medium: { count: 0, value: 0 },
          high: { count: 0, value: 0 },
        },
        valueDistribution: {
          small: { count: 0, value: 0 },
          medium: { count: 0, value: 0 },
          large: { count: 0, value: 0 },
          extraLarge: { count: 0, value: 0 },
        },
        decisionSupport: {
          urgentApprovals: 0,
          overdueItems: 0,
          avgProcessingTime: 24,
          complianceAlerts: 0,
        },
      };
    }
  }

  private processProposalStats(data: any[], type: 'investment' | 'cash'): {
    draft: { count: number; value: number };
    pendingManager: { count: number; value: number };
    pendingCommittee: { count: number; value: number };
    pendingFinance: { count: number; value: number };
    approved: { count: number; value: number };
    rejected: { count: number; value: number };
    total: { count: number; value: number };
  } {
    const amountField = 'amount'; // Both investment and cash requests use 'amount' column
    
    const stats = {
      draft: { count: 0, value: 0 },
      pendingManager: { count: 0, value: 0 },
      pendingCommittee: { count: 0, value: 0 },
      pendingFinance: { count: 0, value: 0 },
      approved: { count: 0, value: 0 },
      rejected: { count: 0, value: 0 },
      total: { count: 0, value: 0 },
    };

    data.forEach(item => {
      const status = item.status;
      const value = item[amountField] || 0;

      // Map database status to dashboard categories
      if (status === 'draft') {
        stats.draft.count++;
        stats.draft.value += value;
      } else if (status === 'pending' || status === 'Manager pending' || status === 'New') {
        stats.pendingManager.count++;
        stats.pendingManager.value += value;
      } else if (status === 'Manager approved' || status === 'Committee pending') {
        stats.pendingCommittee.count++;
        stats.pendingCommittee.value += value;
      } else if (status === 'Committee approved' || status === 'Finance pending') {
        stats.pendingFinance.count++;
        stats.pendingFinance.value += value;
      } else if (status === 'approved') {
        stats.approved.count++;
        stats.approved.value += value;
      } else if (status.includes('rejected') || status === 'rejected') {
        stats.rejected.count++;
        stats.rejected.value += value;
      }

      stats.total.count++;
      stats.total.value += value;
    });

    return stats;
  }

  private processRiskProfileStats(data: any[]): {
    low: { count: number; value: number };
    medium: { count: number; value: number };
    high: { count: number; value: number };
  } {
    const stats = {
      low: { count: 0, value: 0 },
      medium: { count: 0, value: 0 },
      high: { count: 0, value: 0 },
    };

    data.forEach(item => {
      const riskLevel = item.riskLevel?.toLowerCase();
      const value = item.amount || 0;

      if (riskLevel === 'low') {
        stats.low.count++;
        stats.low.value += value;
      } else if (riskLevel === 'medium') {
        stats.medium.count++;
        stats.medium.value += value;
      } else if (riskLevel === 'high') {
        stats.high.count++;
        stats.high.value += value;
      }
    });

    return stats;
  }

  private processValueDistributionStats(data: any[]): {
    small: { count: number; value: number };
    medium: { count: number; value: number };
    large: { count: number; value: number };
    extraLarge: { count: number; value: number };
  } {
    const stats = {
      small: { count: 0, value: 0 },
      medium: { count: 0, value: 0 },
      large: { count: 0, value: 0 },
      extraLarge: { count: 0, value: 0 },
    };

    data.forEach(item => {
      const amount = item.amount || 0;

      if (amount <= 1000000) { // 0-1M
        stats.small.count++;
        stats.small.value += amount;
      } else if (amount <= 5000000) { // 1-5M
        stats.medium.count++;
        stats.medium.value += amount;
      } else if (amount <= 10000000) { // 5-10M
        stats.large.count++;
        stats.large.value += amount;
      } else { // 10M+
        stats.extraLarge.count++;
        stats.extraLarge.value += amount;
      }
    });

    return stats;
  }

  private async getDecisionSupportStats(userId: number, userRole?: string): Promise<{
    urgentApprovals: number;
    overdueItems: number;
    avgProcessingTime: number;
    complianceAlerts: number;
  }> {
    try {
      // Simplified approach - return dummy data for now to avoid SQL errors
      // TODO: Implement proper queries once table structure is confirmed
      
      // For now, return basic stats to get the dashboard working
      const urgentApprovals = 0;
      const overdueItems = 0;
      const avgProcessingTime = 24; // 24 hours default
      const complianceAlerts = 0;

      return {
        urgentApprovals,
        overdueItems,
        avgProcessingTime,
        complianceAlerts,
      };
    } catch (error) {
      console.error('Error in getDecisionSupportStats:', error);
      // Return default values on error
      return {
        urgentApprovals: 0,
        overdueItems: 0,
        avgProcessingTime: 24,
        complianceAlerts: 0,
      };
    }
  }

  async getRecentRequests(limit = 10, userId?: number): Promise<Array<{
    id: number;
    requestId: string;
    type: 'investment' | 'cash_request';
    amount: string;
    status: string;
    createdAt: Date;
    requester: { firstName: string; lastName: string };
    investmentType?: string;
    targetCompany?: string;
    expectedReturn?: string;
    expectedReturnMin?: string;
    expectedReturnMax?: string;
    expectedReturnType?: string;
    riskLevel?: string;
    description?: string;
  }>> {
    try {
      // Get investment requests first
      const investmentRequestsQuery = userId 
        ? db.select().from(investmentRequests).where(eq(investmentRequests.requesterId, userId)).orderBy(desc(investmentRequests.createdAt)).limit(limit)
        : db.select().from(investmentRequests).orderBy(desc(investmentRequests.createdAt)).limit(limit);

      const investmentResults = await investmentRequestsQuery;

      // Get user information for each request
      const resultsWithUsers = await Promise.all(
        investmentResults.map(async (request) => {
          const [user] = await db.select().from(users).where(eq(users.id, request.requesterId));
          return {
            id: request.id,
            requestId: request.requestId,
            type: 'investment' as const,
            amount: request.amount,
            status: request.status,
            createdAt: request.createdAt || new Date(),
            requester: {
              firstName: user.firstName,
              lastName: user.lastName,
            },
            investmentType: request.investmentType,
            targetCompany: request.targetCompany,
            expectedReturn: request.expectedReturn,
            expectedReturnMin: request.expectedReturnMin,
            expectedReturnMax: request.expectedReturnMax,
            expectedReturnType: request.expectedReturnType,
            riskLevel: request.riskLevel,
            description: request.investmentRationale,
          };
        })
      );

      return resultsWithUsers;
    } catch (error) {
      console.error('Error in getRecentRequests:', error);
      return [];
    }
  }

  // Background job operations
  async createBackgroundJob(job: InsertBackgroundJob): Promise<BackgroundJob> {
    const [created] = await db.insert(backgroundJobs).values(job).returning();
    return created;
  }

  async getBackgroundJobsByDocument(documentId: number): Promise<BackgroundJob[]> {
    return await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.documentId, documentId))
      .orderBy(desc(backgroundJobs.createdAt));
  }

  async getBackgroundJob(id: number): Promise<BackgroundJob | undefined> {
    const [job] = await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.id, id));
    return job || undefined;
  }

  async updateBackgroundJob(id: number, job: Partial<InsertBackgroundJob>): Promise<BackgroundJob> {
    const [updated] = await db
      .update(backgroundJobs)
      .set(job)
      .where(eq(backgroundJobs.id, id))
      .returning();
    return updated;
  }

  // Document query operations
  async saveDocumentQuery(query: InsertDocumentQuery): Promise<DocumentQuery> {
    const [saved] = await db.insert(documentQueries).values(query).returning();
    return saved;
  }

  async getDocumentQueries(documentId: number): Promise<any[]> {
    try {
      // Get queries first without ordering to avoid potential issues
      const queries = await db
        .select()
        .from(documentQueries)
        .where(eq(documentQueries.documentId, documentId));
      
      // Sort them manually by createdAt
      queries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Get user info for each query
      const result = [];
      for (const query of queries) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, query.userId));
        
        result.push({
          id: query.id,
          documentId: query.documentId,
          userId: query.userId,
          query: query.query,
          response: query.response,
          createdAt: query.createdAt,
          user: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username
          } : null
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error in getDocumentQueries:', error);
      throw error;
    }
  }

  // Cross-document query operations
  async saveCrossDocumentQuery(query: InsertCrossDocumentQuery): Promise<CrossDocumentQuery> {
    const [saved] = await db.insert(crossDocumentQueries).values(query).returning();
    return saved;
  }

  async getLastResponseId(requestType: string, requestId: number, userId: number): Promise<string | null> {
    try {
      const [lastQuery] = await db
        .select({ openaiResponseId: crossDocumentQueries.openaiResponseId })
        .from(crossDocumentQueries)
        .where(
          and(
            eq(crossDocumentQueries.requestType, requestType),
            eq(crossDocumentQueries.requestId, requestId),
            eq(crossDocumentQueries.userId, userId),
            isNotNull(crossDocumentQueries.openaiResponseId)
          )
        )
        .orderBy(desc(crossDocumentQueries.createdAt))
        .limit(1);
      
      return lastQuery?.openaiResponseId || null;
    } catch (error) {
      console.error('Error getting last response ID:', error);
      return null;
    }
  }

  async getCrossDocumentQueries(requestType: string, requestId: number): Promise<CrossDocumentQuery[]> {
    try {
      const queries = await db
        .select({
          id: crossDocumentQueries.id,
          requestType: crossDocumentQueries.requestType,
          requestId: crossDocumentQueries.requestId,
          userId: crossDocumentQueries.userId,
          query: crossDocumentQueries.query,
          response: crossDocumentQueries.response,
          documentCount: crossDocumentQueries.documentCount,
          createdAt: crossDocumentQueries.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            username: users.username
          }
        })
        .from(crossDocumentQueries)
        .leftJoin(users, eq(crossDocumentQueries.userId, users.id))
        .where(
          and(
            eq(crossDocumentQueries.requestType, requestType),
            eq(crossDocumentQueries.requestId, requestId)
          )
        )
        .orderBy(desc(crossDocumentQueries.createdAt));
      
      return queries;
    } catch (error) {
      console.error('Error in getCrossDocumentQueries:', error);
      throw error;
    }
  }

  // Web search query operations
  async saveWebSearchQuery(query: InsertWebSearchQuery): Promise<WebSearchQuery> {
    const [saved] = await db.insert(webSearchQueries).values(query).returning();
    return saved;
  }

  async getLastWebSearchResponseId(requestType: string, requestId: number, userId: number): Promise<string | null> {
    try {
      const [lastQuery] = await db
        .select({ openaiResponseId: webSearchQueries.openaiResponseId })
        .from(webSearchQueries)
        .where(
          and(
            eq(webSearchQueries.requestType, requestType),
            eq(webSearchQueries.requestId, requestId),
            eq(webSearchQueries.userId, userId),
            isNotNull(webSearchQueries.openaiResponseId)
          )
        )
        .orderBy(desc(webSearchQueries.createdAt))
        .limit(1);
      
      return lastQuery?.openaiResponseId || null;
    } catch (error) {
      console.error('Error getting last web search response ID:', error);
      return null;
    }
  }

  async getWebSearchQueries(requestType: string, requestId: number): Promise<WebSearchQuery[]> {
    try {
      const queries = await db
        .select({
          id: webSearchQueries.id,
          requestType: webSearchQueries.requestType,
          requestId: webSearchQueries.requestId,
          userId: webSearchQueries.userId,
          query: webSearchQueries.query,
          response: webSearchQueries.response,
          searchType: webSearchQueries.searchType,
          createdAt: webSearchQueries.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            username: users.username
          }
        })
        .from(webSearchQueries)
        .leftJoin(users, eq(webSearchQueries.userId, users.id))
        .where(
          and(
            eq(webSearchQueries.requestType, requestType),
            eq(webSearchQueries.requestId, requestId)
          )
        )
        .orderBy(desc(webSearchQueries.createdAt));
      
      return queries;
    } catch (error) {
      console.error('Error in getWebSearchQueries:', error);
      throw error;
    }
  }

  async deleteCrossDocumentQuery(queryId: number, userId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(crossDocumentQueries)
        .where(
          and(
            eq(crossDocumentQueries.id, queryId),
            eq(crossDocumentQueries.userId, userId)
          )
        );
      
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Error in deleteCrossDocumentQuery:', error);
      throw error;
    }
  }

  async deleteWebSearchQuery(queryId: number, userId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(webSearchQueries)
        .where(
          and(
            eq(webSearchQueries.id, queryId),
            eq(webSearchQueries.userId, userId)
          )
        );
      
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Error in deleteWebSearchQuery:', error);
      throw error;
    }
  }

  // Document category operations
  async getDocumentCategories(): Promise<DocumentCategory[]> {
    return await db
      .select()
      .from(documentCategories)
      .where(eq(documentCategories.isActive, true))
      .orderBy(documentCategories.name);
  }

  // Multiple categories per document operations
  async createDocumentCategoryAssociation(documentId: number, categoryId: number, customCategoryName?: string): Promise<any> {
    const [association] = await db
      .insert(documentCategoryAssociations)
      .values({
        documentId,
        categoryId,
        customCategoryName
      })
      .returning();
    return association;
  }

  async getDocumentCategoryAssociations(documentId: number): Promise<any[]> {
    return await db
      .select({
        id: documentCategoryAssociations.id,
        documentId: documentCategoryAssociations.documentId,
        categoryId: documentCategoryAssociations.categoryId,
        customCategoryName: documentCategoryAssociations.customCategoryName,
        createdAt: documentCategoryAssociations.createdAt,
        category: {
          id: documentCategories.id,
          name: documentCategories.name,
          icon: documentCategories.icon,
          description: documentCategories.description
        }
      })
      .from(documentCategoryAssociations)
      .leftJoin(documentCategories, eq(documentCategoryAssociations.categoryId, documentCategories.id))
      .where(eq(documentCategoryAssociations.documentId, documentId));
  }

  async deleteDocumentCategoryAssociation(documentId: number, categoryId: number): Promise<void> {
    await db
      .delete(documentCategoryAssociations)
      .where(
        and(
          eq(documentCategoryAssociations.documentId, documentId),
          eq(documentCategoryAssociations.categoryId, categoryId)
        )
      );
  }

  async createDocumentCategory(category: InsertDocumentCategory): Promise<DocumentCategory> {
    const [newCategory] = await db
      .insert(documentCategories)
      .values(category)
      .returning();
    return newCategory;
  }



  async getDocumentsByCategory(categoryId?: number): Promise<Document[]> {
    if (!categoryId) {
      return await db
        .select()
        .from(documents)
        .orderBy(desc(documents.createdAt));
    }

    // Get documents that have this category association
    const documentsWithCategory = await db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        originalName: documents.originalName,
        fileSize: documents.fileSize,
        mimeType: documents.mimeType,
        fileUrl: documents.fileUrl,
        uploaderId: documents.uploaderId,
        requestType: documents.requestType,
        requestId: documents.requestId,
        categoryId: documents.categoryId,
        subcategoryId: documents.subcategoryId,
        isAutoCategorized: documents.isAutoCategorized,
        analysisStatus: documents.analysisStatus,
        analysis: documents.analysis,
        summary: documents.summary,
        insights: documents.insights,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .innerJoin(documentCategoryAssociations, eq(documents.id, documentCategoryAssociations.documentId))
      .where(eq(documentCategoryAssociations.categoryId, categoryId))
      .orderBy(desc(documents.createdAt));

    return documentsWithCategory;
  }

  // Sequence operations
  async getNextSequenceValue(sequenceName: string): Promise<number> {
    try {
      // Try to get existing sequence
      const [existing] = await db
        .select()
        .from(sequences)
        .where(eq(sequences.sequenceName, sequenceName))
        .limit(1);

      if (existing) {
        // Update and return next value
        const nextValue = existing.currentValue + 1;
        await db
          .update(sequences)
          .set({ 
            currentValue: nextValue, 
            updatedAt: new Date() 
          })
          .where(eq(sequences.id, existing.id));
        
        return nextValue;
      } else {
        // Extract year from sequence name (format: PREFIX_YEAR)
        const yearMatch = sequenceName.match(/_(\d{4})$/);
        const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
        
        // Create new sequence starting at 1
        const [newSequence] = await db
          .insert(sequences)
          .values({
            sequenceName,
            currentValue: 1,
            year,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        return newSequence.currentValue;
      }
    } catch (error) {
      console.error('Error in getNextSequenceValue:', error);
      throw error;
    }
  }

  // Template operations
  async updateTemplate(id: number, template: Partial<InsertTemplate>): Promise<Template> {
    const [updatedTemplate] = await db
      .update(templates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteTemplate(id: number): Promise<void> {
    await db.delete(templates).where(eq(templates.id, id));
  }

  // Investment rationale operations
  async createInvestmentRationale(rationale: InsertInvestmentRationale): Promise<InvestmentRationale> {
    const [newRationale] = await db
      .insert(investmentRationales)
      .values(rationale)
      .returning();
    return newRationale;
  }

  async getInvestmentRationales(investmentId: number): Promise<InvestmentRationale[]> {
    return await db
      .select({
        id: investmentRationales.id,
        investmentId: investmentRationales.investmentId,
        templateId: investmentRationales.templateId,
        content: investmentRationales.content,
        type: investmentRationales.type,
        authorId: investmentRationales.authorId,
        createdAt: investmentRationales.createdAt,
        updatedAt: investmentRationales.updatedAt,
        template: {
          id: templates.id,
          name: templates.name
        },
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(investmentRationales)
      .leftJoin(templates, eq(investmentRationales.templateId, templates.id))
      .leftJoin(users, eq(investmentRationales.authorId, users.id))
      .where(eq(investmentRationales.investmentId, investmentId))
      .orderBy(desc(investmentRationales.createdAt));
  }

  async updateInvestmentRationale(id: number, rationale: Partial<InsertInvestmentRationale>): Promise<InvestmentRationale> {
    const [updatedRationale] = await db
      .update(investmentRationales)
      .set(rationale) // Remove updatedAt since it's auto-managed by defaultNow()
      .where(eq(investmentRationales.id, id))
      .returning();
    return updatedRationale;
  }

  async deleteInvestmentRationale(id: number): Promise<void> {
    await db.delete(investmentRationales).where(eq(investmentRationales.id, id));
  }


}

export const storage = new DatabaseStorage();
