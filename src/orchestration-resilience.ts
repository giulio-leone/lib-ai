export interface ResilienceContext {
  userId: string;
  name: string;
  stateId: string | undefined;
  phaseResults: Map<string, unknown>;
}

/**
 * Minimal orchestration resilience helper.
 * Provides phase execution context with result storage.
 */
export class OrchestrationResilience {
  async createContext(
    userId: string,
    name: string,
    stateId?: string
  ): Promise<ResilienceContext> {
    return {
      userId,
      name,
      stateId,
      phaseResults: new Map<string, unknown>(),
    };
  }

  async executePhase<T>(
    _ctx: ResilienceContext,
    _phaseName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return fn();
  }

  async complete(_ctx: ResilienceContext): Promise<void> {
    // no-op
  }
}
