import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { RemindersService } from './reminders.service.js';

const CHECK_EVERY_MS = 60_000;

/** Vérifie chaque minute si les rappels sont dus (18h00 à Paris) ; le service évite les doublons. */
@Injectable()
export class ReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReminderScheduler.name);
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(@Inject(RemindersService) private readonly reminders: RemindersService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.tick(), CHECK_EVERY_MS);
    this.timer.unref();
    void this.tick();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.reminders.sendDueReminders();
    } catch (error) {
      this.logger.error(`Reminder run failed: ${String(error)}`);
    } finally {
      this.running = false;
    }
  }
}
