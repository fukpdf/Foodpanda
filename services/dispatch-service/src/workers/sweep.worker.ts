import type { DispatchService } from "../services/dispatch.service.js";

interface Logger {
  info(obj: object | string, msg?: string): void;
  error(obj: object | string, msg?: string): void;
  warn(obj: object | string, msg?: string): void;
}

export class SweepWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly dispatchService: DispatchService,
    private readonly intervalMs: number,
    private readonly logger: Logger,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;

    // Immediate recovery pass on startup to handle service restarts
    // where offers may have expired while the service was down.
    void this.runSweep().catch((err: unknown) => {
      this.logger.error(
        { err },
        "Dispatch sweep: initial recovery pass failed",
      );
    });

    this.timer = setInterval(() => {
      void this.runSweep().catch((err: unknown) => {
        this.logger.error({ err }, "Dispatch sweep: periodic run failed");
      });
    }, this.intervalMs);

    // Don't block process exit when the event loop is otherwise empty
    this.timer.unref();

    this.logger.info(
      { intervalMs: this.intervalMs },
      "Dispatch sweep worker started",
    );
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
    this.logger.info({}, "Dispatch sweep worker stopped");
  }

  async runSweep(): Promise<void> {
    const processed = await this.dispatchService.processExpiredOffers();
    if (processed > 0) {
      this.logger.info(
        { processed },
        "Dispatch sweep: processed expired dispatch offers",
      );
    }
  }
}
