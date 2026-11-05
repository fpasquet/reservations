import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DomainErrorFilter } from './shared/domain-error.filter.js';

const app = await NestFactory.create(AppModule);
app.setGlobalPrefix('api');
app.useGlobalFilters(new DomainErrorFilter());
// L'interface appelle l'API directement depuis le navigateur.
app.enableCors({ origin: process.env['APP_URL'] ?? 'http://localhost:3030' });
app.enableShutdownHooks();
await app.listen(Number(process.env['PORT'] ?? 4030));
