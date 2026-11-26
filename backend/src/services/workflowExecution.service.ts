import crypto from 'crypto';
import { emailActionService } from './emailAction.service.js';
import { smtpConnectionService } from './smtpConnection.service.js';
import { gmailApiService } from './gmailApi.service.js';
import { gmailConnectionService } from './gmailConnection.service.js';
import { taskService } from './task.service.js';
import { AppError } from '../utils/apiResponse.js';

export interface ConditionRule {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'starts_with'
    | 'ends_with'
    | 'greater_than'
    | 'less_than'
    | 'is_empty'
    | 'is_not_empty';
  value: string;
}

export interface EmailActionConfig {
  connectionId?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body?: string;
  html?: string;
  fromName?: string;
  fromEmail?: string;
}

export interface GmailActionConfig {
  connectionId?: string;
  actionType: 'send' | 'reply' | 'reply_all';
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  html?: string;
  fromName?: string;
  messageId?: string;
  threadId?: string;
}

export interface WorkflowBranch {
  id: string;
  name: string; // Dynamic user-defined label (e.g. 'High Priority', 'Paid', 'New Lead')
  conditionValue: string; // Target value to match on condition field
  operator?: string;
  rule?: ConditionRule;
  emailAction?: EmailActionConfig;
  actionType?: 'smtp' | 'gmail_send' | 'gmail_reply' | 'gmail_reply_all';
  gmailAction?: GmailActionConfig;
}

export interface ConditionNodeConfig {
  field: string; // e.g. "booking_status"
  branches: WorkflowBranch[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  userId?: string;
  trigger?: {
    type: 'webhook' | 'gmail';
    config?: Record<string, any>;
  };
  condition?: ConditionNodeConfig;
  actionType?: 'smtp' | 'gmail_send' | 'gmail_reply' | 'gmail_reply_all';
  defaultEmailAction?: EmailActionConfig;
  defaultGmailAction?: GmailActionConfig;
}

export interface StepExecutionLog {
  stepNumber: number;
  stepName: string;
  type: 'trigger' | 'condition' | 'action';
  status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
  startedAt: Date;
  completedAt: Date;
  details: Record<string, any>;
}

export interface WorkflowExecutionResult {
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: 'SUCCESS' | 'FAILED';
  isDryRun: boolean;
  executedAt: Date;
  selectedBranchId?: string;
  selectedBranchName?: string;
  evaluatedCondition?: {
    field: string;
    actualValue: any;
    matchedValue: string;
  };
  stepLogs: StepExecutionLog[];
  renderedEmail?: {
    to: string;
    subject: string;
    body: string;
    fromName?: string;
    tokensUsed: string[];
  };
  error?: string;
  taskDeducted: boolean;
  taskStatusNote: string;
}

export class WorkflowExecutionEngine {
  // In-memory execution log buffer (no database requirement)
  private executionHistory = new Map<string, WorkflowExecutionResult[]>();

  /**
   * Helper to look up nested or prefixed property keys in payload
   * (e.g. "booking_status", "1.booking_status", "booking.status")
   */
  public extractPayloadValue(payload: Record<string, any>, key: string): any {
    if (!payload || typeof payload !== 'object') return undefined;

    // Check direct key
    if (key in payload) {
      return payload[key];
    }

    // Check stripped step prefix (e.g. "1.booking_status" -> "booking_status")
    const cleanKey = key.replace(/^[0-9]+\./, '');
    if (cleanKey in payload) {
      return payload[cleanKey];
    }

    // Also check if any key in payload matches cleanKey when stripped of step prefix
    for (const [k, v] of Object.entries(payload)) {
      if (k.replace(/^[0-9]+\./, '') === cleanKey) {
        return v;
      }
    }

    // Check nested path (e.g. "booking.status")
    const parts = cleanKey.split('.');
    let current: any = payload;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return current;
  }

  /**
   * Evaluates a rule against the actual value using generic comparison operators
   */
  public evaluateRule(actual: any, operator: string, target?: string): boolean {
    if (operator === 'is_empty') {
      return actual === undefined || actual === null || String(actual).trim() === '';
    }
    if (operator === 'is_not_empty') {
      return actual !== undefined && actual !== null && String(actual).trim() !== '';
    }

    if (actual === undefined || actual === null) {
      return false;
    }

    const actualStr = String(actual).trim().toLowerCase();
    const targetStr = target !== undefined && target !== null ? String(target).trim().toLowerCase() : '';

    switch (operator) {
      case 'equals':
        return actualStr === targetStr;
      case 'not_equals':
        return actualStr !== targetStr;
      case 'contains':
        return actualStr.includes(targetStr);
      case 'starts_with':
        return actualStr.startsWith(targetStr);
      case 'ends_with':
        return actualStr.endsWith(targetStr);
      case 'greater_than': {
        const numActual = Number(actual);
        const numTarget = Number(target);
        if (!isNaN(numActual) && !isNaN(numTarget)) {
          return numActual > numTarget;
        }
        return actualStr > targetStr;
      }
      case 'less_than': {
        const numActual = Number(actual);
        const numTarget = Number(target);
        if (!isNaN(numActual) && !isNaN(numTarget)) {
          return numActual < numTarget;
        }
        return actualStr < targetStr;
      }
      default:
        return actualStr === targetStr;
    }
  }

  /**
   * Validates workflow definition integrity
   */
  public validateWorkflowDefinition(workflow: WorkflowDefinition): void {
    if (!workflow || !workflow.id) {
      throw new AppError('Invalid workflow definition: Missing workflow ID', 400);
    }

    if (workflow.condition) {
      if (!workflow.condition.field || typeof workflow.condition.field !== 'string') {
        throw new AppError('Invalid condition definition: Condition field name is required', 400);
      }

      if (!Array.isArray(workflow.condition.branches) || workflow.condition.branches.length === 0) {
        throw new AppError('Invalid condition definition: At least one branch must be configured', 400);
      }

      for (const branch of workflow.condition.branches) {
        if (!branch.name || !branch.conditionValue) {
          throw new AppError(`Invalid branch definition: Branch name and conditionValue are required`, 400);
        }
        if (!branch.emailAction && !branch.gmailAction) {
          throw new AppError(`Invalid branch definition: Branch "${branch.name}" requires an emailAction configuration`, 400);
        }
      }
    }
  }

  /**
   * Executes a complete workflow flow:
   * Webhook Trigger -> Condition -> Email Action
   */
  async execute(params: {
    workflow: WorkflowDefinition;
    payload: Record<string, any>;
    isDryRun?: boolean;
    userId?: string;
  }): Promise<WorkflowExecutionResult> {
    const { workflow, payload = {}, isDryRun = true, userId = 'usr_guest' } = params;
    const executionId = 'exec_' + crypto.randomBytes(12).toString('hex');
    const executedAt = new Date();
    const stepLogs: StepExecutionLog[] = [];

    try {
      // 1. Validate workflow definition
      this.validateWorkflowDefinition(workflow);

      // Step 1: Webhook Trigger Log
      const triggerStart = new Date();
      stepLogs.push({
        stepNumber: 1,
        stepName: 'Webhook Trigger',
        type: 'trigger',
        status: 'SUCCESS',
        startedAt: triggerStart,
        completedAt: new Date(),
        details: {
          payloadSize: JSON.stringify(payload).length,
          keysDetected: Object.keys(payload),
        },
      });

      let selectedBranch: WorkflowBranch | undefined;
      let evaluatedCondition: { field: string; actualValue: any; matchedValue: string } | undefined;
      let renderedEmail: any = undefined;

      // Step 2: Condition Evaluation (if condition is configured)
      if (workflow.condition && workflow.condition.branches.length > 0) {
        const condStart = new Date();
        const fieldName = workflow.condition.field;
        const actualValue = this.extractPayloadValue(payload, fieldName);

        if (actualValue === undefined) {
          stepLogs.push({
            stepNumber: 2,
            stepName: 'Condition (Router)',
            type: 'condition',
            status: 'FAILED',
            startedAt: condStart,
            completedAt: new Date(),
            details: {
              field: fieldName,
              error: `Field "${fieldName}" not found in webhook payload`,
            },
          });
          throw new AppError(
            `Condition evaluation failed: Field "${fieldName}" not found in webhook payload. Available keys: [${Object.keys(payload).join(', ')}]`,
            400
          );
        }

        // Evaluate branches
        for (const branch of workflow.condition.branches) {
          const operator = branch.rule?.operator || branch.operator || 'equals';
          const targetValue = branch.conditionValue;

          if (this.evaluateRule(actualValue, operator, targetValue)) {
            selectedBranch = branch;
            evaluatedCondition = {
              field: fieldName,
              actualValue,
              matchedValue: targetValue,
            };
            break;
          }
        }

        if (!selectedBranch) {
          stepLogs.push({
            stepNumber: 2,
            stepName: 'Condition (Router)',
            type: 'condition',
            status: 'FAILED',
            startedAt: condStart,
            completedAt: new Date(),
            details: {
              field: fieldName,
              actualValue,
              branchesChecked: workflow.condition.branches.map((b) => b.conditionValue),
              error: `No branch condition matched actual value "${actualValue}"`,
            },
          });
          throw new AppError(
            `No matching condition branch found for "${fieldName}" = "${actualValue}".`,
            400
          );
        }

        stepLogs.push({
          stepNumber: 2,
          stepName: 'Condition (Router)',
          type: 'condition',
          status: 'SUCCESS',
          startedAt: condStart,
          completedAt: new Date(),
          details: {
            field: fieldName,
            actualValue,
            selectedBranchId: selectedBranch.id,
            selectedBranchName: selectedBranch.name,
            matchedValue: selectedBranch.conditionValue,
          },
        });
      }

      // Step 3: Action Resolution (SMTP Email or Gmail Action)
      const isGmail = Boolean(
        selectedBranch?.actionType?.startsWith('gmail') ||
        selectedBranch?.gmailAction ||
        workflow.actionType?.startsWith('gmail') ||
        workflow.defaultGmailAction
      );

      const actionStart = new Date();

      if (isGmail) {
        // GMAIL ACTION EXECUTION
        const gmailConfig = selectedBranch?.gmailAction || workflow.defaultGmailAction;
        if (!gmailConfig) {
          throw new AppError('No Gmail action configuration found for execution.', 400);
        }

        const actionType = gmailConfig.actionType || (selectedBranch?.actionType?.replace('gmail_', '') as any) || 'send';
        const interpolatedTo = emailActionService.interpolate(gmailConfig.to || '', payload).result;
        const interpolatedCc = gmailConfig.cc ? emailActionService.interpolate(gmailConfig.cc, payload).result : undefined;
        const interpolatedBcc = gmailConfig.bcc ? emailActionService.interpolate(gmailConfig.bcc, payload).result : undefined;
        const interpolatedSubject = emailActionService.interpolate(gmailConfig.subject || '', payload).result;
        const interpolatedBody = emailActionService.interpolate(gmailConfig.body || '', payload).result;
        const interpolatedMessageId = gmailConfig.messageId ? emailActionService.interpolate(gmailConfig.messageId, payload).result : '';
        const interpolatedThreadId = gmailConfig.threadId ? emailActionService.interpolate(gmailConfig.threadId, payload).result : '';

        // Extract used tokens
        const tokensUsed: string[] = [];
        const rawStrings = [gmailConfig.to, gmailConfig.cc, gmailConfig.bcc, gmailConfig.subject, gmailConfig.body, gmailConfig.messageId, gmailConfig.threadId].filter(Boolean);
        for (const s of rawStrings) {
          const matches = s?.match(/\{\{([^}]+)\}\}/g) || [];
          tokensUsed.push(...matches);
        }

        renderedEmail = {
          to: interpolatedTo || 'recipient@example.com',
          subject: interpolatedSubject || 'Subject',
          body: interpolatedBody,
          fromName: gmailConfig.fromName || 'KAIRA Connect Gmail',
          tokensUsed: Array.from(new Set(tokensUsed)),
        };

        if (isDryRun) {
          stepLogs.push({
            stepNumber: 3,
            stepName: `Gmail Action (${actionType.toUpperCase()})`,
            type: 'action',
            status: 'SUCCESS',
            startedAt: actionStart,
            completedAt: new Date(),
            details: {
              actionType,
              to: renderedEmail.to,
              subject: renderedEmail.subject,
              threadId: interpolatedThreadId || 'dry_run_thread_id',
              messageId: interpolatedMessageId || 'dry_run_message_id',
              isDryRun: true,
              deliveryMode: 'DRY_RUN_PREVIEW',
              deliveryNote: 'Gmail dry-run preview rendered. No actual email sent.',
            },
          });
        } else {
          // Production Gmail Action Execution
          let connectionId = gmailConfig.connectionId;
          if (!connectionId) {
            const userConns = gmailConnectionService.getUserConnections(userId);
            if (userConns.length > 0) connectionId = userConns[0].id;
          }

          if (!connectionId) {
            stepLogs.push({
              stepNumber: 3,
              stepName: `Gmail Action (${actionType.toUpperCase()})`,
              type: 'action',
              status: 'FAILED',
              startedAt: actionStart,
              completedAt: new Date(),
              details: {
                error: 'Production execution failed: No connected Gmail account found. Please connect Gmail in Connections.',
                isDryRun: false,
              },
            });
            throw new AppError('Production execution failed: No connected Gmail account found. Please connect Gmail in Connections.', 400);
          }

          try {
            let actionResult;
            if (actionType === 'reply') {
              actionResult = await gmailApiService.replyToEmail({
                connectionId,
                userId,
                messageId: interpolatedMessageId,
                threadId: interpolatedThreadId,
                bodyText: interpolatedBody,
                fromName: gmailConfig.fromName,
                isDryRun: false,
              });
            } else if (actionType === 'reply_all') {
              actionResult = await gmailApiService.replyAllToEmail({
                connectionId,
                userId,
                messageId: interpolatedMessageId,
                threadId: interpolatedThreadId,
                bodyText: interpolatedBody,
                fromName: gmailConfig.fromName,
                isDryRun: false,
              });
            } else {
              actionResult = await gmailApiService.sendEmail({
                connectionId,
                userId,
                to: interpolatedTo,
                cc: interpolatedCc,
                bcc: interpolatedBcc,
                subject: interpolatedSubject,
                bodyText: interpolatedBody,
                fromName: gmailConfig.fromName,
                isDryRun: false,
              });
            }

            stepLogs.push({
              stepNumber: 3,
              stepName: `Gmail Action (${actionType.toUpperCase()})`,
              type: 'action',
              status: 'SUCCESS',
              startedAt: actionStart,
              completedAt: new Date(),
              details: {
                actionType,
                to: actionResult.to,
                subject: actionResult.subject,
                messageId: actionResult.messageId,
                threadId: actionResult.threadId,
                isDryRun: false,
                deliveryMode: 'GMAIL_API',
              },
            });
          } catch (dispatchErr: any) {
            stepLogs.push({
              stepNumber: 3,
              stepName: `Gmail Action (${actionType.toUpperCase()})`,
              type: 'action',
              status: 'FAILED',
              startedAt: actionStart,
              completedAt: new Date(),
              details: {
                error: dispatchErr.message,
                isDryRun: false,
              },
            });
            throw dispatchErr;
          }
        }
      } else {
        // SMTP EMAIL ACTION EXECUTION (Preserved)
        const emailConfig = selectedBranch?.emailAction || workflow.defaultEmailAction;

        if (!emailConfig) {
          throw new AppError('No email action configuration found for execution.', 400);
        }

        const preview = emailActionService.previewEmailAction(emailConfig, payload);

        if (isDryRun) {
          renderedEmail = {
            to: preview.interpolatedTo,
            subject: preview.interpolatedSubject,
            body: preview.interpolatedBody,
            fromName: emailConfig.fromName || 'KAIRA Connect',
            tokensUsed: preview.mappedVariables,
          };

          stepLogs.push({
            stepNumber: 3,
            stepName: `Email Action (${selectedBranch?.name || 'Default'})`,
            type: 'action',
            status: 'SUCCESS',
            startedAt: actionStart,
            completedAt: new Date(),
            details: {
              to: renderedEmail.to,
              subject: renderedEmail.subject,
              isDryRun: true,
              deliveryNote: 'Dry-run preview rendered. No actual email sent.',
            },
          });
        } else {
          // Production Run: Requires configured SMTP connection
          let connection = emailConfig.connectionId
            ? smtpConnectionService.getConnectionInternal(emailConfig.connectionId, userId)
            : null;

          // If no explicit connection ID, check if user has a connection
          if (!connection) {
            const userConns = smtpConnectionService.getUserConnections(userId);
            if (userConns.length > 0) {
              connection = smtpConnectionService.getConnectionInternal(userConns[0].id, userId);
            }
          }

          if (!connection) {
            stepLogs.push({
              stepNumber: 3,
              stepName: `Email Action (${selectedBranch?.name || 'Default'})`,
              type: 'action',
              status: 'FAILED',
              startedAt: actionStart,
              completedAt: new Date(),
              details: {
                error: 'Production execution failed: No SMTP connection configured. Please connect an SMTP mailer in Connections.',
                isDryRun: false,
              },
            });
            throw new AppError(
              'Production execution failed: No SMTP connection configured. Please connect an SMTP mailer in Connections.',
              400
            );
          }

          try {
            const dispatchResult = await emailActionService.dispatchEmailAction({
              config: emailConfig,
              payload,
              connection,
              isDryRun: false,
            });

            renderedEmail = {
              to: preview.interpolatedTo,
              subject: preview.interpolatedSubject,
              body: preview.interpolatedBody,
              fromName: emailConfig.fromName || connection.senderName || 'KAIRA Connect',
              tokensUsed: preview.mappedVariables,
            };

            stepLogs.push({
              stepNumber: 3,
              stepName: `Email Action (${selectedBranch?.name || 'Default'})`,
              type: 'action',
              status: 'SUCCESS',
              startedAt: actionStart,
              completedAt: new Date(),
              details: {
                to: preview.interpolatedTo,
                subject: preview.interpolatedSubject,
                messageId: dispatchResult.messageId,
                accepted: dispatchResult.accepted,
                isDryRun: false,
                deliveryMode: 'SMTP_REAL',
              },
            });
          } catch (dispatchErr: any) {
            stepLogs.push({
              stepNumber: 3,
              stepName: `Email Action (${selectedBranch?.name || 'Default'})`,
              type: 'action',
              status: 'FAILED',
              startedAt: actionStart,
              completedAt: new Date(),
              details: {
                error: dispatchErr.message,
                isDryRun: false,
              },
            });
            throw dispatchErr;
          }
        }
      }

      // Task Allocation Coordination
      let taskDeducted = false;
      let taskStatusNote = 'Dry-run execution completed. Zero tasks consumed.';

      if (!isDryRun) {
        // Production run: Coordinate task deduction with trusted TaskService
        try {
          await taskService.recordExecution({
            userId,
            workflowId: workflow.id,
            workflowName: workflow.name || 'Untitled Workflow',
            executionId,
            status: 'SUCCESS',
            actionCount: 1,
            isTest: false,
            isTrustedEngine: true,
          });
          taskDeducted = true;
          taskStatusNote = '1 task successfully consumed for complete production workflow execution.';
        } catch (taskErr: any) {
          // If task limit was reached, catch and bubble appropriately
          taskStatusNote = taskErr.message || 'Task deduction failed.';
        }
      }

      const result: WorkflowExecutionResult = {
        executionId,
        workflowId: workflow.id,
        workflowName: workflow.name || 'Untitled Workflow',
        status: 'SUCCESS',
        isDryRun,
        executedAt,
        selectedBranchId: selectedBranch?.id,
        selectedBranchName: selectedBranch?.name,
        evaluatedCondition,
        stepLogs,
        renderedEmail,
        taskDeducted,
        taskStatusNote,
      };

      // Record in in-memory history
      const existingLogs = this.executionHistory.get(workflow.id) || [];
      existingLogs.unshift(result);
      if (existingLogs.length > 20) existingLogs.pop();
      this.executionHistory.set(workflow.id, existingLogs);

      return result;
    } catch (err: any) {
      const failedResult: WorkflowExecutionResult = {
        executionId,
        workflowId: workflow.id,
        workflowName: workflow.name || 'Untitled Workflow',
        status: 'FAILED',
        isDryRun,
        executedAt,
        stepLogs,
        error: err.message || 'Workflow execution encountered an error.',
        taskDeducted: false,
        taskStatusNote: 'Failed execution. Zero tasks consumed.',
      };

      const existingLogs = this.executionHistory.get(workflow.id) || [];
      existingLogs.unshift(failedResult);
      if (existingLogs.length > 20) existingLogs.pop();
      this.executionHistory.set(workflow.id, existingLogs);

      return failedResult;
    }
  }

  /**
   * Retrieves execution history for a workflow
   */
  getExecutionHistory(workflowId: string): WorkflowExecutionResult[] {
    return this.executionHistory.get(workflowId) || [];
  }

  /**
   * Clear execution history for a workflow
   */
  clearExecutionHistory(workflowId: string): void {
    this.executionHistory.delete(workflowId);
  }

  /**
   * Reset all history (for unit testing)
   */
  resetAll(): void {
    this.executionHistory.clear();
  }
}

export const workflowExecutionEngine = new WorkflowExecutionEngine();
