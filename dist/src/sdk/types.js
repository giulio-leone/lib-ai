/**
 * AI SDK Wrapper Types
 *
 * Defines the unified interface for AI providers in the OneCoach AI stack.
 */
/**
 * Error handling helper
 */
export function handleError(error) {
    if (error instanceof Error) {
        return error;
    }
    if (typeof error === 'string') {
        return new Error(error);
    }
    return new Error(String(error));
}
