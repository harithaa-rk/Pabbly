import { z } from 'zod';

export const createWorkflowSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Workflow name is required')
    .max(100, 'Workflow name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .nullable(),
});

export const updateWorkflowSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Workflow name cannot be empty')
    .max(100, 'Workflow name cannot exceed 100 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .nullable(),
  nodes: z.array(z.any()).optional(),
  connections: z.array(z.any()).optional(),
});

export const updateWorkflowStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE'], {
    errorMap: () => ({ message: 'Status must be DRAFT, ACTIVE, or INACTIVE' }),
  }),
});

export const workflowQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ALL']).optional(),
  sort: z.enum(['name', 'createdAt', 'updatedAt', 'status']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const saveTriggerSchema = z.object({
  type: z.enum(['webhook', 'manual'], {
    errorMap: () => ({ message: 'Trigger type must be either webhook or manual' }),
  }),
  name: z
    .string()
    .trim()
    .min(1, 'Trigger name is required')
    .max(100, 'Trigger name cannot exceed 100 characters'),
  enabled: z.boolean().optional().default(true),
  config: z
    .object({
      method: z.enum(['POST']).optional(),
    })
    .optional()
    .default({}),
});

export const updateTriggerStatusSchema = z.object({
  enabled: z.boolean({
    required_error: 'Trigger enabled state is required',
    invalid_type_error: 'Trigger enabled state must be a boolean',
  }),
});

