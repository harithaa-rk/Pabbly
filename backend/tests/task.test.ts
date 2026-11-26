import { TaskService } from '../src/services/task.service.js';
import { prisma } from '../src/config/database.js';
import { AppError } from '../utils/apiResponse.js';

describe('Task Management & Billing Service - Production Readiness Audit Suite', () => {
  let taskService: TaskService;

  let mockTaskUsages: Map<string, any>;
  let mockExecutions: Map<string, any>;

  beforeEach(() => {
    taskService = new TaskService();
    mockTaskUsages = new Map();
    mockExecutions = new Map();

    // Mock prisma.taskUsage
    jest.spyOn(prisma.taskUsage, 'findUnique').mockImplementation(async ({ where }: any) => {
      const usage = mockTaskUsages.get(where.userId);
      return usage ? { ...usage } : null;
    });

    jest.spyOn(prisma.taskUsage, 'create').mockImplementation(async ({ data }: any) => {
      const created = {
        id: 'tu_' + Math.random().toString(36).substring(2, 9),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockTaskUsages.set(data.userId, created);
      return { ...created };
    });

    jest.spyOn(prisma.taskUsage, 'update').mockImplementation(async ({ where, data }: any) => {
      const existing = mockTaskUsages.get(where.userId);
      if (!existing) throw new Error('Task usage record not found');

      const updated = { ...existing };
      if (data.tasksConsumed?.increment !== undefined) {
        updated.tasksConsumed = (updated.tasksConsumed || 0) + data.tasksConsumed.increment;
      } else if (data.tasksConsumed?.decrement !== undefined) {
        updated.tasksConsumed = Math.max(0, (updated.tasksConsumed || 0) - data.tasksConsumed.decrement);
      } else if (data.tasksConsumed !== undefined) {
        updated.tasksConsumed = data.tasksConsumed;
      }

      if (data.freeTasksConsumed?.increment !== undefined) {
        updated.freeTasksConsumed = (updated.freeTasksConsumed || 0) + data.freeTasksConsumed.increment;
      } else if (data.freeTasksConsumed?.decrement !== undefined) {
        updated.freeTasksConsumed = Math.max(0, (updated.freeTasksConsumed || 0) - data.freeTasksConsumed.decrement);
      } else if (data.freeTasksConsumed !== undefined) {
        updated.freeTasksConsumed = data.freeTasksConsumed;
      }

      if (data.tasksAllocated !== undefined) updated.tasksAllocated = data.tasksAllocated;
      if (data.billingPeriodStart !== undefined) updated.billingPeriodStart = data.billingPeriodStart;
      if (data.billingPeriodEnd !== undefined) updated.billingPeriodEnd = data.billingPeriodEnd;
      if (data.lastResetAt !== undefined) updated.lastResetAt = data.lastResetAt;

      updated.updatedAt = new Date();
      mockTaskUsages.set(where.userId, updated);
      return { ...updated };
    });

    // Mock prisma.workflowExecution
    jest.spyOn(prisma.workflowExecution, 'findUnique').mockImplementation(async ({ where }: any) => {
      const exec = mockExecutions.get(where.executionId);
      return exec ? { ...exec } : null;
    });

    jest.spyOn(prisma.workflowExecution, 'create').mockImplementation(async ({ data }: any) => {
      if (mockExecutions.has(data.executionId)) {
        const error: any = new Error('Unique constraint failed on the constraint: `executionId`');
        error.code = 'P2002';
        throw error;
      }
      const created = {
        id: 'we_' + Math.random().toString(36).substring(2, 9),
        ...data,
        executedAt: new Date(),
      };
      mockExecutions.set(data.executionId, created);
      return { ...created };
    });

    jest.spyOn(prisma.workflowExecution, 'findMany').mockImplementation(async ({ where }: any) => {
      const all = Array.from(mockExecutions.values());
      return all.filter((e) => {
        if (where.userId && e.userId !== where.userId) return false;
        if (where.status && e.status !== where.status) return false;
        return true;
      });
    });

    jest.spyOn(prisma.workflowExecution, 'count').mockImplementation(async ({ where }: any) => {
      const all = Array.from(mockExecutions.values());
      return all.filter((e) => {
        if (where.userId && e.userId !== where.userId) return false;
        if (where.status && e.status !== where.status) return false;
        return true;
      }).length;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1. Audit Requirement 2 & 3: Clients cannot forge production execution records without trusted engine context
  it('1. Rejects production execution recording when not called by trusted backend engine', async () => {
    const userId = 'user_audit_1';
    await taskService.getOrCreateTaskUsage(userId);

    await expect(
      taskService.recordExecution({
        userId,
        workflowId: 'wf_untrusted',
        workflowName: 'Untrusted Client Attempt',
        executionId: 'exec_untrusted_1',
        status: 'SUCCESS',
        isTest: false,
        isTrustedEngine: false, // Untrusted client
      })
    ).rejects.toThrow('Direct client invocation of execution accounting is not permitted');

    const usage = await taskService.getOrCreateTaskUsage(userId);
    expect(usage.tasksConsumed).toBe(0);
  });

  // 2. Audit Requirement 1 & 4: Trusted backend execution engine deducts exactly 1 task on successful completion
  it('2. Trusted backend execution engine successfully deducts exactly 1 task on completion', async () => {
    const userId = 'user_audit_2';
    await taskService.getOrCreateTaskUsage(userId);

    const result = await taskService.recordExecution({
      userId,
      workflowId: 'wf_trusted',
      workflowName: 'Trusted Engine Run',
      executionId: 'exec_trusted_1',
      status: 'SUCCESS',
      isTest: false,
      isTrustedEngine: true, // Trusted backend execution lifecycle
    });

    expect(result.taskConsumed).toBe(true);

    const usage = await taskService.getOrCreateTaskUsage(userId);
    expect(usage.tasksConsumed).toBe(1);
    expect(usage.tasksRemaining).toBe(99);
  });

  // 3. Multi-action workflow consumes exactly 1 task
  it('3. Multi-action workflow (10 actions) consumes only 1 task', async () => {
    const userId = 'user_audit_3';
    await taskService.getOrCreateTaskUsage(userId);

    const result = await taskService.recordExecution({
      userId,
      workflowId: 'wf_multi',
      workflowName: '10 Action Workflow',
      executionId: 'exec_multi_1',
      status: 'SUCCESS',
      actionCount: 10,
      isTest: false,
      isTrustedEngine: true,
    });

    expect(result.taskConsumed).toBe(true);
    expect(result.actionCount).toBe(10);

    const usage = await taskService.getOrCreateTaskUsage(userId);
    expect(usage.tasksConsumed).toBe(1);
  });

  // 4. Failed workflow execution never consumes tasks
  it('4. Failed execution does not consume any tasks', async () => {
    const userId = 'user_audit_4';
    await taskService.getOrCreateTaskUsage(userId);

    const result = await taskService.recordExecution({
      userId,
      workflowId: 'wf_failed',
      workflowName: 'Failed Run',
      executionId: 'exec_fail_1',
      status: 'FAILED',
      failureReason: 'Gateway 504 Timeout',
      isTest: false,
      isTrustedEngine: true,
    });

    expect(result.taskConsumed).toBe(false);
    expect(result.failureReason).toBe('Gateway 504 Timeout');

    const usage = await taskService.getOrCreateTaskUsage(userId);
    expect(usage.tasksConsumed).toBe(0);
  });

  // 5. Test executions from builder never consume tasks
  it('5. Test execution from builder never consumes tasks', async () => {
    const userId = 'user_audit_5';
    await taskService.getOrCreateTaskUsage(userId);

    const result = await taskService.recordExecution({
      userId,
      workflowId: 'wf_test',
      workflowName: 'Builder Test Trigger',
      executionId: 'exec_test_run_1',
      status: 'SUCCESS',
      isTest: true, // Test execution
      isTrustedEngine: false, // Allowed for test without deducting
    });

    expect(result.taskConsumed).toBe(false);

    const usage = await taskService.getOrCreateTaskUsage(userId);
    expect(usage.tasksConsumed).toBe(0);
  });

  // 6. Idempotency on duplicate callbacks, retries, and restarts
  it('6. Duplicate webhook callbacks and internal retries are idempotent and do not deduct again', async () => {
    const userId = 'user_audit_6';
    await taskService.getOrCreateTaskUsage(userId);

    const firstRun = await taskService.recordExecution({
      userId,
      workflowId: 'wf_webhook',
      workflowName: 'Webhook Lead Sync',
      executionId: 'webhook_unique_event_999',
      status: 'SUCCESS',
      isTest: false,
      isTrustedEngine: true,
    });

    expect(firstRun.taskConsumed).toBe(true);

    // Duplicate webhook delivery with identical executionId
    const duplicateDelivery = await taskService.recordExecution({
      userId,
      workflowId: 'wf_webhook',
      workflowName: 'Webhook Lead Sync',
      executionId: 'webhook_unique_event_999',
      status: 'SUCCESS',
      isTest: false,
      isTrustedEngine: true,
    });

    expect(duplicateDelivery.id).toBe(firstRun.id);

    const usage = await taskService.getOrCreateTaskUsage(userId);
    expect(usage.tasksConsumed).toBe(1); // Exactly 1 task!
  });

  // 7. Monthly resets cannot run twice for the same billing period
  it('7. Monthly reset cannot run twice for the same billing period', async () => {
    const userId = 'user_audit_7';
    // Initialize user with expired past billing cycle and 50 consumed tasks
    const pastStart = new Date(Date.now() - 40 * 86400000);
    const pastEnd = new Date(Date.now() - 10 * 86400000);
    mockTaskUsages.set(userId, {
      userId,
      plan: 'FREE',
      tasksAllocated: 100,
      tasksConsumed: 50,
      freeTasksConsumed: 50,
      billingPeriodStart: pastStart,
      billingPeriodEnd: pastEnd,
    });

    // First reset call: cycle expired, resets tasksConsumed to 0
    await taskService.performMonthlyReset(userId);
    const afterFirstReset = await taskService.getOrCreateTaskUsage(userId);
    expect(afterFirstReset.tasksConsumed).toBe(0);

    // User consumes 5 tasks in the new active period
    mockTaskUsages.set(userId, {
      ...afterFirstReset,
      tasksConsumed: 5,
    });

    // Duplicate reset call in the same active billing period must NOT reset the 5 consumed tasks
    await taskService.performMonthlyReset(userId);
    const afterSecondCall = await taskService.getOrCreateTaskUsage(userId);
    expect(afterSecondCall.tasksConsumed).toBe(5); // Guarded!
  });

  // 8. User reaching limit cannot execute new production workflows
  it('8. Reaching 0 remaining tasks prevents new production executions without deleting workflows', async () => {
    const userId = 'user_audit_8';
    const usage = await taskService.getOrCreateTaskUsage(userId);

    // Simulate 100 consumed tasks
    mockTaskUsages.set(userId, {
      ...usage,
      tasksConsumed: 100,
      tasksAllocated: 100,
    });

    await expect(
      taskService.recordExecution({
        userId,
        workflowId: 'wf_blocked',
        workflowName: 'Paused Execution Workflow',
        executionId: 'exec_over_limit_1',
        status: 'SUCCESS',
        isTest: false,
        isTrustedEngine: true,
      })
    ).rejects.toThrow('Monthly task limit reached');

    const finalUsage = await taskService.getOrCreateTaskUsage(userId);
    expect(finalUsage.tasksConsumed).toBe(100);
    expect(finalUsage.tasksRemaining).toBe(0);
  });

  // 9. Multi-tenant isolation: User A cannot impact User B
  it('9. Strict multi-tenant isolation across user task balances', async () => {
    const userA = 'user_tenant_A';
    const userB = 'user_tenant_B';

    await taskService.getOrCreateTaskUsage(userA);
    await taskService.getOrCreateTaskUsage(userB);

    await taskService.recordExecution({
      userId: userA,
      workflowId: 'wf_A',
      workflowName: 'Tenant A Workflow',
      executionId: 'exec_A_only',
      status: 'SUCCESS',
      isTest: false,
      isTrustedEngine: true,
    });

    const usageA = await taskService.getOrCreateTaskUsage(userA);
    const usageB = await taskService.getOrCreateTaskUsage(userB);

    expect(usageA.tasksConsumed).toBe(1);
    expect(usageA.tasksRemaining).toBe(99);

    expect(usageB.tasksConsumed).toBe(0);
    expect(usageB.tasksRemaining).toBe(100);
  });
});
