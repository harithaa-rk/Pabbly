import { api } from '../lib/api';

export interface WebhookField {
  key: string;
  value: any;
  type: string;
}

export const SAMPLE_WEBHOOK_TEMPLATES: Record<string, { name: string; payload: Record<string, any> }> = {
  contactLead: {
    name: 'Lead & Contact Form (General Inquiry)',
    payload: {
      leadId: 'LD-10021',
      fullName: 'Sarah Jenkins',
      email: 'sarah.jenkins@example.com',
      company: 'Acme Cloud Corp',
      status: 'new',
      priority: 'high',
      source: 'Website Contact Form',
      message: 'Looking for a demonstration of KAIRA workflow automation.',
      submittedAt: '2026-11-19T10:30:00Z',
    },
  },
  ecommerceOrder: {
    name: 'E-Commerce Order (Online Store)',
    payload: {
      orderId: 'ORD-98421',
      customerName: 'David Miller',
      customerEmail: 'david.m@example.com',
      itemCount: 3,
      totalAmount: 149.99,
      status: 'paid',
      shippingAddress: '452 Elm Street, Austin, TX 78701',
      paymentMethod: 'Credit Card',
    },
  },
  supportTicket: {
    name: 'Customer Support Ticket (Helpdesk)',
    payload: {
      ticketId: 'TCK-5542',
      requesterName: 'Elena Rostova',
      requesterEmail: 'elena@startup.io',
      category: 'Billing',
      priority: 'urgent',
      status: 'open',
      subject: 'Question regarding monthly invoice',
    },
  },
  saasSignup: {
    name: 'SaaS User Registration (Product)',
    payload: {
      userId: 'usr_87234',
      userName: 'Alex Morgan',
      userEmail: 'alex.m@example.com',
      plan: 'Growth Plan',
      status: 'active',
      referralSource: 'Organic Search',
    },
  },
  serviceAppointment: {
    name: 'Appointment & Booking (Services & Clinics)',
    payload: {
      bookingId: 'BK-9021',
      fullName: 'Jordan Lee',
      email: 'jordan.lee@example.com',
      service: 'Consultation',
      status: 'confirmed',
      appointmentDate: '2026-11-25 10:00 AM',
    },
  },
  bookingConfirmed: {
    name: 'Booking Confirmed (Status: confirmed)',
    payload: {
      bookingId: 'BK-9021',
      fullName: 'Sarah Jenkins',
      email: 'sarah.jenkins@example.com',
      company: 'Acme Cloud Corp',
      booking_status: 'confirmed',
      appointmentDate: '2026-11-25 10:00 AM',
      service: 'Workflow Automation Demo',
    },
  },
  bookingCancelled: {
    name: 'Booking Cancelled (Status: cancelled)',
    payload: {
      bookingId: 'BK-9022',
      fullName: 'David Miller',
      email: 'david.m@example.com',
      company: 'Miller Retail',
      booking_status: 'cancelled',
      appointmentDate: '2026-11-26 02:00 PM',
      cancellationReason: 'Schedule conflict',
    },
  },
  bookingRescheduled: {
    name: 'Booking Rescheduled (Status: rescheduled - Unmatched)',
    payload: {
      bookingId: 'BK-9023',
      fullName: 'Alex Morgan',
      email: 'alex.m@example.com',
      company: 'Morgan Legal',
      booking_status: 'rescheduled',
      appointmentDate: '2026-11-28 04:00 PM',
      service: 'General Consultation',
    },
  },
  contactForm: {
    name: 'Contact Form Submission',
    payload: {
      fullName: 'Sarah Jenkins',
      email: 'sarah.jenkins@example.com',
      company: 'Acme Cloud Corp',
      message: 'Looking for a demonstration of KAIRA workflow automation for our marketing team.',
      phone: '+1 (555) 234-5678',
      submittedAt: '2026-11-19T10:30:00Z',
    },
  },
  userSignup: {
    name: 'New SaaS User Registration',
    payload: {
      userId: 'usr_87234',
      userName: 'Elena Rostova',
      userEmail: 'elena@startup.io',
      plan: 'Starter Plan',
      referralSource: 'Organic Search',
      signupDate: '2026-11-19T12:00:00Z',
    },
  },
};

export function extractFieldsFromPayload(payload: Record<string, any>, prefix = ''): WebhookField[] {
  const fields: WebhookField[] = [];

  if (!payload || typeof payload !== 'object') {
    return fields;
  }

  for (const [key, value] of Object.entries(payload)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const type = Array.isArray(value) ? 'array' : typeof value;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recurse for nested objects
      fields.push({ key: fullKey, value: '[Object]', type: 'object' });
      fields.push(...extractFieldsFromPayload(value, fullKey));
    } else {
      fields.push({
        key: fullKey,
        value: typeof value === 'object' ? JSON.stringify(value) : value,
        type,
      });
    }
  }

  return fields;
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

export interface EmailPreviewResult {
  interpolatedTo: string;
  interpolatedCc?: string;
  interpolatedBcc?: string;
  interpolatedSubject: string;
  interpolatedBody: string;
  interpolatedHtml?: string;
  mappedVariables: string[];
  isReadyForDispatch: boolean;
  statusNote: string;
}

export function interpolateTemplate(
  template: string,
  sampleData: Record<string, any>
): { result: string; tokensUsed: string[] } {
  if (!template) return { result: '', tokensUsed: [] };

  const tokensUsed: string[] = [];
  const regex = /\{\{([^}]+)\}\}/g;

  const result = template.replace(regex, (_match, rawKey) => {
    const trimmed = rawKey.trim();
    tokensUsed.push(trimmed);

    // Support "1.fieldName" or just "fieldName"
    const keyParts = trimmed.split('.');
    const propertyName = keyParts.length > 1 ? keyParts.slice(1).join('.') : keyParts[0];

    if (sampleData && propertyName in sampleData) {
      const val = sampleData[propertyName];
      return typeof val === 'object' ? JSON.stringify(val) : String(val);
    }

    return `{{${trimmed}}}`;
  });

  return { result, tokensUsed };
}

export function evaluateConditionRule(actual: any, operator: string, target?: string): boolean {
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

class FrontendWebhookService {
  async getLatestPayload(workflowId: string): Promise<Record<string, any> | null> {
    try {
      const response = await api.get(`/webhooks/${workflowId}/latest`);
      if (response.data.data?.hasPayload && response.data.data?.event?.payload) {
        return response.data.data.event.payload;
      }
      return null;
    } catch {
      return null;
    }
  }

  async clearPayloads(workflowId: string): Promise<void> {
    try {
      await api.delete(`/webhooks/${workflowId}`);
    } catch {
      // Graceful fallback
    }
  }

  async previewEmailAction(
    config: EmailActionConfig,
    sampleData: Record<string, any> = {}
  ): Promise<EmailPreviewResult> {
    try {
      const response = await api.post('/webhooks/preview-email', { config, sampleData });
      if (response.data?.data?.preview) {
        return response.data.data.preview;
      }
    } catch {
      // Fallback to client-side interpolation
    }

    const toRes = interpolateTemplate(config?.to || '', sampleData);
    const ccRes = interpolateTemplate(config?.cc || '', sampleData);
    const bccRes = interpolateTemplate(config?.bcc || '', sampleData);
    const subRes = interpolateTemplate(config?.subject || '', sampleData);
    const bodyRes = interpolateTemplate(config?.body || '', sampleData);
    const htmlRes = interpolateTemplate(config?.html || '', sampleData);

    const isReady = Boolean(
      config?.to?.trim() && config?.subject?.trim() && (config?.body?.trim() || config?.html?.trim())
    );

    return {
      interpolatedTo: toRes.result,
      interpolatedCc: ccRes.result || undefined,
      interpolatedBcc: bccRes.result || undefined,
      interpolatedSubject: subRes.result,
      interpolatedBody: bodyRes.result,
      interpolatedHtml: htmlRes.result || undefined,
      mappedVariables: Array.from(
        new Set([
          ...toRes.tokensUsed,
          ...ccRes.tokensUsed,
          ...bccRes.tokensUsed,
          ...subRes.tokensUsed,
          ...bodyRes.tokensUsed,
          ...htmlRes.tokensUsed,
        ])
      ),
      isReadyForDispatch: isReady,
      statusNote:
        'Preview validated. In dry-run mode, zero emails are dispatched and zero tasks are consumed.',
    };
  }

  async executeWorkflowDryRun(
    workflow: any,
    payload: Record<string, any>
  ): Promise<any> {
    try {
      const response = await api.post('/webhooks/workflow/dry-run', { workflow, payload });
      if (response.data?.data?.result) {
        return response.data.data.result;
      }
    } catch {
      // Local fallback execution logic
    }

    // Client-side fallback execution
    const branches = workflow.condition?.branches || [];
    const conditionField = workflow.condition?.field || 'booking_status';
    const actualValue = payload[conditionField] ?? payload[conditionField.replace(/^[0-9]+\./, '')];

    const stepLogs: any[] = [
      {
        stepNumber: 1,
        stepName: 'Webhook Trigger',
        type: 'trigger',
        status: 'SUCCESS',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        details: { keysDetected: Object.keys(payload) },
      },
    ];

    if (actualValue === undefined || actualValue === null) {
      stepLogs.push({
        stepNumber: 2,
        stepName: `Condition Router (${conditionField})`,
        type: 'condition',
        status: 'FAILED',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        details: { field: conditionField, error: 'Field not found in webhook payload' },
      });

      return {
        executionId: 'exec_client_' + Math.random().toString(36).substring(2, 9),
        workflowId: workflow.id,
        workflowName: workflow.name,
        status: 'FAILED',
        isDryRun: true,
        executedAt: new Date().toISOString(),
        evaluatedCondition: {
          field: conditionField,
          actualValue: undefined,
          matchedValue: 'none',
        },
        stepLogs,
        error: `Condition evaluation failed: Field "${conditionField}" not found in webhook payload. Available keys: [${Object.keys(payload).join(', ')}]`,
        taskDeducted: false,
        taskStatusNote: 'Dry-run execution completed. Zero tasks consumed.',
      };
    }

    const selectedBranch = branches.find((b: any) => {
      const op = b.rule?.operator || b.operator || 'equals';
      const targetVal = b.conditionValue;
      return evaluateConditionRule(actualValue, op, targetVal);
    });

    if (!selectedBranch) {
      stepLogs.push({
        stepNumber: 2,
        stepName: `Condition Router (${conditionField})`,
        type: 'condition',
        status: 'FAILED',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        details: {
          field: conditionField,
          actualValue,
          configuredBranches: branches.map((b: any) => b.conditionValue),
        },
      });

      return {
        executionId: 'exec_client_' + Math.random().toString(36).substring(2, 9),
        workflowId: workflow.id,
        workflowName: workflow.name,
        status: 'FAILED',
        isDryRun: true,
        executedAt: new Date().toISOString(),
        evaluatedCondition: {
          field: conditionField,
          actualValue,
          matchedValue: 'unmatched',
        },
        stepLogs,
        error: `No matching condition branch found for "${conditionField}" = "${actualValue}". Configured branches: [${branches.map((b: any) => b.conditionValue).join(', ')}]`,
        taskDeducted: false,
        taskStatusNote: 'Dry-run execution completed. Zero tasks consumed.',
      };
    }

    const emailConfig = selectedBranch?.emailAction || {
      to: '{{1.email}}',
      subject: `Notification: ${selectedBranch.name}`,
      body: `Status: ${selectedBranch.conditionValue}`,
    };

    const preview = await this.previewEmailAction(emailConfig, payload);

    stepLogs.push({
      stepNumber: 2,
      stepName: `Condition Router (${selectedBranch.name})`,
      type: 'condition',
      status: 'SUCCESS',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      details: { field: conditionField, actualValue, branch: selectedBranch.name },
    });

    stepLogs.push({
      stepNumber: 3,
      stepName: `Email Action (${selectedBranch.name})`,
      type: 'action',
      status: 'SUCCESS',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      details: { to: preview.interpolatedTo, subject: preview.interpolatedSubject },
    });

    return {
      executionId: 'exec_client_' + Math.random().toString(36).substring(2, 9),
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: 'SUCCESS',
      isDryRun: true,
      executedAt: new Date().toISOString(),
      selectedBranchId: selectedBranch.id,
      selectedBranchName: selectedBranch.name,
      evaluatedCondition: {
        field: conditionField,
        actualValue,
        matchedValue: selectedBranch.conditionValue,
      },
      stepLogs,
      renderedEmail: {
        to: preview.interpolatedTo,
        subject: preview.interpolatedSubject,
        body: preview.interpolatedBody,
        fromName: emailConfig.fromName || 'KAIRA Connect',
        tokensUsed: preview.mappedVariables,
      },
      taskDeducted: false,
      taskStatusNote: 'Dry-run execution completed. Zero tasks consumed.',
    };
  }
}

export const frontendWebhookService = new FrontendWebhookService();
