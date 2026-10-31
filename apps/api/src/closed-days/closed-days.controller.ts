import { Controller, Get, Inject, Query } from '@nestjs/common';
import { DomainError } from '../shared/domain-error.js';
import { isIsoDate } from '../shared/paris-time.js';
import type { ClosedDay } from './closed-day.js';
import { CLOSED_DAYS_REPOSITORY, type ClosedDaysRepository } from './closed-days.repository.js';

@Controller('closed-days')
export class ClosedDaysController {
  constructor(@Inject(CLOSED_DAYS_REPOSITORY) private readonly closedDays: ClosedDaysRepository) {}

  /** `?date=YYYY-MM-DD` : le jour de fermeture à cette date, ou aucun si l'espace y est ouvert. */
  @Get()
  async list(@Query('date') date: string | undefined): Promise<ClosedDay[]> {
    if (date === undefined || !isIsoDate(date))
      throw new DomainError('INVALID_DATE', 'date must be YYYY-MM-DD', 'date');
    const closed = await this.closedDays.find(date);
    return closed ? [closed] : [];
  }
}
