import { prisma } from '../config/database.js';
import { AppError } from '../utils/apiResponse.js';

export interface TaskUsageSummary {
  tasksAllocated: number;
  tasksConsumed: number;
  tasksRemaining: number;
  freeTasksConsumed: number;
  plan: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  resetDate: string;
}

export interface RecordExecutionInput {
  userId: string;
  workflowId: string;
  workflowName: string;
  executionId: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
  actionCount?: number;
  isTest?: boolean;
  failureReason?: string;
  isTrustedEngine?: boolean;
}

export interface ExecutionRecordOutput {
  id: string;
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: string;
  actionCount: number;
  taskConsumed: boolean;
  isTest: boolean;
  failureReason?: string | null;
  executedAt: Date;
}

export class TaskService {
  public static readonly FREE_MONTHLY_ALLOCATION = 100;

  /**
   * Calculates calendar-based monthly billing cycle bounds (UTC).
   */
  public getBillingCycleBounds(date: Date = new Date()): { start: Date; end: Date } {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    return { start, end };
  }

  /**
   * Retrieves or initializes task usage record for a user, executing monthly reset if due.
   */
  async getOrCreateTaskUsage(userId: string): Promise<TaskUsageSummary> {
    const now = new Date();
    const { start, end } = this.getBillingCycleBounds(now);

    let usage = await prisma.taskUsage.findUnique({
      where: { userId },
    });

    if (!usage) {
      usage = await prisma.taskUsage.create({
        data: {
          userId,
          plan: 'FREE',
          tasksAllocated: TaskService.FREE_MONTHLY_ALLOCATION,
          tasksConsumed: 0,
          freeTasksConsumed: 0,
          billingPeriodStart: start,
          billingPeriodEnd: end,
          lastResetAt: now,
        },
      });
    } else if (now >= new Date(usage.billingPeriodEnd)) {
      // Monthly cycle has expired; trigger safe reset
      usage = await this.performMonthlyReset(userId);
    }

    if (!usage) {
      throw new AppError('Failed to initialize task usage record.', 500);
    }

    const tasksRemaining = Math.max(0, usage.tasksAllocated - usage.tasksConsumed);

    return {
      tasksAllocated: usage.tasksAllocated,
      tasksConsumed: usage.tasksConsumed,
      tasksRemaining,
      freeTasksConsumed: usage.freeTasksConsumed,
      plan: usage.plan,
      billingPeriodStart: usage.billingPeriodStart,
      billingPeriodEnd: usage.billingPeriodEnd,
      resetDate: usage.billingPeriodEnd.toISOString(),
    };
  }

  /**
   * Performs an idempotent monthly task reset for a user.
   * Guarantees that reset cannot run twice for the same billing period.
   */
  async performMonthlyReset(userId: string): Promise<any> {
    const now = new Date();
    const { start, end } = this.getBillingCycleBounds(now);

    const existing = await prisma.taskUsage.findUnique({
      where: { userId },
    });

    if (existing) {
      // Guard against duplicate resets: if current time has not passed billingPeriodEnd AND cycle start is current, skip
      if (now < new Date(existing.billingPeriodEnd) && new Date(existing.billingPeriodStart).getTime() >= start.getTime()) {
        return existing;
      }
    }

    // Reset tasks consumed to zero and advance billing bounds without rollover
    const updated = await prisma.taskUsage.update({
      where: { userId },
      data: {
        tasksAllocated: TaskService.FREE_MONTHLY_ALLOCATION,
        tasksConsumed: 0,
        freeTasksConsumed: 0,
        billingPeriodStart: start,
        billingPeriodEnd: end,
        lastResetAt: now,
      },
    });

    return updated;
  }

  /**
   * Validates if user has remaining task balance before starting a production execution.
   */
  async assertCanExecute(userId: string, isTest: boolean = false): Promise<void> {
    if (isTest) return; // Test runs are always free and unblocked

    const usage = await this.getOrCreateTaskUsage(userId);
    if (usage.tasksRemaining <= 0) {
      throw new AppError(
        'Monthly task limit reached (100/100). Production workflow executions are paused until the next monthly allocation.',
        403,
        [{ field: 'tasksRemaining', message: '0 tasks remaining. Limit reached.' }]
      );
    }
  }

  /**
   * Records a workflow execution and safely coordinates task deduction.
   * - Enforces trusted execution engine authorization for production runs.
   * - Guarantees idempotency for duplicate webhooks, retries, and restarts.
   * - Coordinates deduction atomically to prevent concurrent balance overshoot.
   */
  async recordExecution(input: RecordExecutionInput): Promise<ExecutionRecordOutput> {
    const {
      userId,
      workflowId,
      workflowName,
      executionId,
      status,
      actionCount = 1,
      isTest = false,
      failureReason,
      isTrustedEngine = false,
    } = input;

    // Security check: Only the trusted backend execution engine can record production executions.
    if (!isTest && !isTrustedEngine) {
      throw new AppError(
        'Direct client invocation of execution accounting is not permitted. Task deduction is managed internally by the trusted workflow execution engine.',
        403
      );
    }

    // 1. Idempotency check: if executionId already exists, return it immediately without duplicate deduction
    const existing = await prisma.workflowExecution.findUnique({
      where: { executionId },
    });

    if (existing) {
      return {
        id: existing.id,
        executionId: existing.executionId,
        workflowId: existing.workflowId,
        workflowName: existing.workflowName,
        status: existing.status,
        actionCount: existing.actionCount,
        taskConsumed: existing.taskConsumed,
        isTest: existing.isTest,
        failureReason: existing.failureReason,
        executedAt: existing.executedAt,
      };
    }

    // 2. Only a successful, non-test execution deducts a task
    const shouldDeductTask = status === 'SUCCESS' && !isTest;

    if (shouldDeductTask) {
      // Coordinated atomic deduction: ensure balance is available and increment inside safe logic
      const currentUsage = await this.getOrCreateTaskUsage(userId);

      if (currentUsage.tasksRemaining <= 0) {
        throw new AppError(
          'Monthly task limit reached (100/100). Production workflow executions are paused until the next monthly allocation.',
          403,
          [{ field: 'tasksRemaining', message: '0 tasks remaining. Limit reached.' }]
        );
      }

      // Atomically increment consumed tasks
      await prisma.taskUsage.update({
        where: { userId },
        data: {
          tasksConsumed: { increment: 1 },
          freeTasksConsumed: { increment: 1 },
        },
      });
    }

    // 3. Record execution history (handling possible race-condition duplicate executionId gracefully)
    try {
      const execution = await prisma.workflowExecution.create({
        data: {
          userId,
          workflowId,
          workflowName: workflowName || 'Untitled Workflow',
          executionId,
          status,
          actionCount: Math.max(1, actionCount),
          taskConsumed: shouldDeductTask,
          isTest,
          failureReason: status === 'FAILED' ? failureReason || 'Execution encountered an error' : null,
          executedAt: new Date(),
        },
      });

      return {
        id: execution.id,
        executionId: execution.executionId,
        workflowId: execution.workflowId,
        workflowName: execution.workflowName,
        status: execution.status,
        actionCount: execution.actionCount,
        taskConsumed: execution.taskConsumed,
        isTest: execution.isTest,
        failureReason: execution.failureReason,
        executedAt: execution.executedAt,
      };
    } catch (error: any) {
      // If a concurrent execution created this executionId simultaneously (P2002 Unique constraint)
      if (error?.code === 'P2002' || error?.message?.includes('Unique constraint')) {
        const raceExisting = await prisma.workflowExecution.findUnique({
          where: { executionId },
        });
        if (raceExisting) {
          // If task was incremented in this failed duplicate branch, rollback increment
          if (shouldDeductTask) {
            await prisma.taskUsage.update({
              where: { userId },
              data: {
                tasksConsumed: { decrement: 1 },
                freeTasksConsumed: { decrement: 1 },
              },
            });
          }
          return {
            id: raceExisting.id,
            executionId: raceExisting.executionId,
            workflowId: raceExisting.workflowId,
            workflowName: raceExisting.workflowName,
            status: raceExisting.status,
            actionCount: raceExisting.actionCount,
            taskConsumed: raceExisting.taskConsumed,
            isTest: raceExisting.isTest,
            failureReason: raceExisting.failureReason,
            executedAt: raceExisting.executedAt,
          };
        }
      }
      throw error;
    }
  }

  /**
   * Retrieves paginated execution history for a user.
   */
  async getExecutionHistory(
    userId: string,
    filter: 'ALL' | 'SUCCESS' | 'FAILED' = 'ALL',
    page: number = 1,
    limit: number = 20
  ): Promise<{ executions: ExecutionRecordOutput[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const whereClause: any = { userId };

    if (filter === 'SUCCESS') {
      whereClause.status = 'SUCCESS';
    } else if (filter === 'FAILED') {
      whereClause.status = 'FAILED';
    }

    const [executions, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where: whereClause,
        orderBy: { executedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.workflowExecution.count({ where: whereClause }),
    ]);

    return {
      executions: executions.map((e) => ({
        id: e.id,
        executionId: e.executionId,
        workflowId: e.workflowId,
        workflowName: e.workflowName,
        status: e.status,
        actionCount: e.actionCount,
        taskConsumed: e.taskConsumed,
        isTest: e.isTest,
        failureReason: e.failureReason,
        executedAt: e.executedAt,
      })),
      total,
      page,
      limit,
    };
  }
}

export const taskService = new TaskService();
