/**
 * WorkflowProgressService
 *
 * Hexagonal Port + Adapter for tracking long-running AI workflow progress.
 * Writes to the `workflow.workflow_run_metadata` table in the workflow schema
 * (outside Prisma's public schema — uses raw SQL).
 *
 * Enables:
 * - Real-time progress updates via Supabase Realtime
 * - Resume from failure
 * - Background execution tracking
 */

import { prisma } from '@giulio-leone/lib-core';

// --- Port (Types) ---

export interface CreateRunInput {
  runId: string;
  userId: string;
  workflowType: string;
  agentId: string;
  inputData?: Record<string, unknown>;
  estimatedDurationMs?: number;
  totalSteps?: number;
}

export interface UpdateProgressInput {
  runId: string;
  progress: number;
  currentStep?: string;
}

export interface CompleteWorkflowInput {
  runId: string;
  outputData?: Record<string, unknown>;
  resultEntityType?: string;
  resultEntityId?: string;
}

export interface FailWorkflowInput {
  runId: string;
  errorMessage: string;
}

export interface IWorkflowProgressService {
  createRun(input: CreateRunInput): Promise<void>;
  updateProgress(input: UpdateProgressInput): Promise<void>;
  completeWorkflow(input: CompleteWorkflowInput): Promise<void>;
  failWorkflow(input: FailWorkflowInput): Promise<void>;
}

// --- Adapter (Implementation) ---

class WorkflowProgressServiceImpl implements IWorkflowProgressService {
  /**
   * Create a new workflow run metadata record.
   */
  async createRun(input: CreateRunInput): Promise<void> {
    await prisma.$executeRawUnsafe(
      `INSERT INTO workflow.workflow_run_metadata 
       (run_id, user_id, workflow_type, agent_id, input_data, estimated_duration_ms, total_steps, progress)
       VALUES ($1, $2, $3::text::"WorkflowType", $4, $5::jsonb, $6, $7, 0)`,
      input.runId,
      input.userId,
      input.workflowType,
      input.agentId,
      input.inputData ? JSON.stringify(input.inputData) : null,
      input.estimatedDurationMs ?? null,
      input.totalSteps ?? null,
    );
  }

  /**
   * Update the progress of a running workflow.
   */
  async updateProgress(input: UpdateProgressInput): Promise<void> {
    await prisma.$executeRawUnsafe(
      `UPDATE workflow.workflow_run_metadata 
       SET progress = $2, current_step = $3
       WHERE run_id = $1`,
      input.runId,
      Math.min(Math.max(input.progress, 0), 100),
      input.currentStep ?? null,
    );
  }

  /**
   * Mark a workflow as successfully completed.
   */
  async completeWorkflow(input: CompleteWorkflowInput): Promise<void> {
    await prisma.$executeRawUnsafe(
      `UPDATE workflow.workflow_run_metadata 
       SET progress = 100, 
           completed_at = NOW(),
           output_data = $2::jsonb,
           result_entity_type = $3,
           result_entity_id = $4
       WHERE run_id = $1`,
      input.runId,
      input.outputData ? JSON.stringify(input.outputData) : null,
      input.resultEntityType ?? null,
      input.resultEntityId ?? null,
    );
  }

  /**
   * Mark a workflow as failed with an error message.
   */
  async failWorkflow(input: FailWorkflowInput): Promise<void> {
    await prisma.$executeRawUnsafe(
      `UPDATE workflow.workflow_run_metadata 
       SET error_message = $2, completed_at = NOW()
       WHERE run_id = $1`,
      input.runId,
      input.errorMessage,
    );
  }
}

/** Singleton instance */
export const workflowProgressService: IWorkflowProgressService =
  new WorkflowProgressServiceImpl();
