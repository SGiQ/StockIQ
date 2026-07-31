/**
 * Native half — see useUnscrollableStage.web.ts for the real implementation.
 *
 * Native views have no scroll offset to fight over, so this does nothing. It
 * still takes the id so both platforms share one call signature.
 */
export function useUnscrollableStage(_stageId: string): void {}
