import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { CLOSED_DAYS_REPOSITORY, type ClosedDaysRepository } from './closed-days.repository.js';
import { parsePublicHolidays } from './public-holidays.js';

export const PUBLIC_HOLIDAYS_SOURCE = Symbol('PUBLIC_HOLIDAYS_SOURCE');
export type PublicHolidaysSource = () => Promise<unknown>;

const ONE_DAY = 24 * 60 * 60 * 1000;

/** Relit les jours fériés une fois par jour ; si l'API ne répond pas, la dernière liste enregistrée reste valable. */
@Injectable()
export class PublicHolidaysSync implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublicHolidaysSync.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(CLOSED_DAYS_REPOSITORY) private readonly closedDays: ClosedDaysRepository,
    @Inject(PUBLIC_HOLIDAYS_SOURCE) private readonly source: PublicHolidaysSource,
  ) {}

  onModuleInit(): void {
    // Sans attendre : l'API démarre même si l'API des jours fériés est lente.
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), ONE_DAY);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  /** Vrai si la liste a été mise à jour ; une erreur laisse la liste en place. */
  async refresh(): Promise<boolean> {
    try {
      const days = parsePublicHolidays(await this.source());
      if (!days) throw new Error('unexpected payload');
      await this.closedDays.replacePublicHolidays(days);
      return true;
    } catch (error) {
      this.logger.warn(`public holidays not refreshed, keeping the last known list: ${String(error)}`);
      return false;
    }
  }
}
