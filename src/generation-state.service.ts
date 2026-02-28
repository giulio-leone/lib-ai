/**
 * GenerationStateService
 *
 * Hexagonal Port + Adapter for managing AI generation recovery states.
 * Allows users to resume interrupted multi-phase generation workflows
 * (nutrition plans, workout plans, agenda planning).
 */

import { prisma } from '@giulio-leone/lib-core';

// --- Port (Types) ---

export type GenerationType = 'workout' | 'nutrition' | 'oneagenda';

export interface GenerationState {
  id: string;
  userId: string;
  type: string;
  currentPhase: string;
  completedPhases: string[];
  context: unknown;
  checkpoints: unknown;
  lastError: { message: string; [key: string]: unknown } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGenerationStateService {
  getRecoverableStates(
    userId: string,
    type?: GenerationType,
  ): Promise<GenerationState[]>;
  deleteState(stateId: string): Promise<void>;
  saveState(
    state: Omit<GenerationState, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<GenerationState>;
  updatePhase(
    stateId: string,
    phase: string,
    context?: unknown,
  ): Promise<void>;
}

// --- Adapter (Implementation) ---

class GenerationStateServiceImpl implements IGenerationStateService {
  /**
   * Retrieve all recoverable generation states for a user,
   * optionally filtered by generation type.
   */
  async getRecoverableStates(
    userId: string,
    type?: GenerationType,
  ): Promise<GenerationState[]> {
    const where: Record<string, unknown> = { userId };
    if (type) where.type = type;

    const states = await prisma.generation_states.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return states.map((s: any) => this.toGenerationState(s));
  }

  /**
   * Delete a generation state by ID.
   */
  async deleteState(stateId: string): Promise<void> {
    await prisma.generation_states.delete({
      where: { id: stateId },
    });
  }

  /**
   * Create a new generation state checkpoint.
   */
  async saveState(
    state: Omit<GenerationState, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<GenerationState> {
    const created = await prisma.generation_states.create({
      data: {
        userId: state.userId,
        type: state.type,
        currentPhase: state.currentPhase,
        completedPhases: state.completedPhases,
        context: state.context as never,
        checkpoints: state.checkpoints as never,
        lastError: state.lastError as never,
      },
    });

    return this.toGenerationState(created);
  }

  /**
   * Update the current phase and optionally merge new context.
   */
  async updatePhase(
    stateId: string,
    phase: string,
    context?: unknown,
  ): Promise<void> {
    const existing = await prisma.generation_states.findUniqueOrThrow({
      where: { id: stateId },
    });

    const completedPhases = [
      ...(existing.completedPhases ?? []),
      existing.currentPhase,
    ];

    await prisma.generation_states.update({
      where: { id: stateId },
      data: {
        currentPhase: phase,
        completedPhases,
        ...(context !== undefined
          ? { context: context as never }
          : {}),
      },
    });
  }

  // --- Private Helpers ---

  private toGenerationState(
    row: Record<string, unknown>,
  ): GenerationState {
    return {
      id: row.id as string,
      userId: row.userId as string,
      type: row.type as string,
      currentPhase: row.currentPhase as string,
      completedPhases: (row.completedPhases as string[]) ?? [],
      context: row.context,
      checkpoints: row.checkpoints,
      lastError: row.lastError as GenerationState['lastError'],
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
    };
  }
}

/** Singleton service — static API for convenience */
export const GenerationStateService = new GenerationStateServiceImpl();
