import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .optional(),
  avatar: z
    .string()
    .trim()
    .url('Avatar must be a valid URL')
    .or(z.literal(''))
    .nullable()
    .optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'USER', 'TEAM_MEMBER'], {
    required_error: 'Role is required and must be ADMIN, USER, or TEAM_MEMBER',
  }),
});

export const updateStatusSchema = z.object({
  isActive: z.boolean({
    required_error: 'isActive status is required (boolean)',
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

