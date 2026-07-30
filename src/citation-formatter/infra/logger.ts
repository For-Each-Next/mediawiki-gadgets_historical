/**
 * Console timing for browser entry and explicit formatting actions.
 */

const PREFIX = "[citation formatter]";

export type ExecutionClock = () => number;
export type ExecutionLog = (prefix: string, message: string) => void;
export type FinishExecutionTimer = () => void;

/**
 * Starts a one-shot, monotonic execution timer.
 *
 * @param label - Completed operation shown in the console.
 * @param clock - Monotonic time source.
 * @param log - Console-compatible output sink.
 * @returns Idempotent completion callback.
 */
export function startExecutionTimer(
    label: string,
    clock: ExecutionClock = readExecutionTime,
    log: ExecutionLog = writeExecutionTime,
): FinishExecutionTimer {
    const startedAt = clock();
    let finished = false;
    return function finishExecutionTimer(): void {
        if (finished) {
            return;
        }
        finished = true;
        const elapsed = Math.max(0, clock() - startedAt);
        log(PREFIX, `${label} in ${elapsed.toFixed(2)} ms`);
    };
}

/** Reports a startup failure with the shared console marker. */
export function reportStartupFailure(error: unknown): void {
    console.error(PREFIX, "failed to start.", error);
}

function readExecutionTime(): number {
    return performance.now();
}

function writeExecutionTime(prefix: string, message: string): void {
    console.log(prefix, message);
}
