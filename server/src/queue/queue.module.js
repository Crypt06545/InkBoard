var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailProcessor } from './processors/email.processor.js';
import { MailerModule } from '../src/common/mailer/mailer.module.js';
let QueueModule = class QueueModule {
};
QueueModule = __decorate([
    Module({
        imports: [
            BullModule.forRootAsync({
                useFactory: () => ({
                    connection: {
                        url: process.env.REDIS_TCP_URL,
                        tls: {
                            rejectUnauthorized: false,
                        },
                        maxRetriesPerRequest: null,
                    },
                }),
            }),
            BullModule.registerQueue({
                name: 'email-queue',
            }),
            MailerModule,
        ],
        providers: [EmailProcessor],
        exports: [BullModule],
    })
], QueueModule);
export { QueueModule };
//# sourceMappingURL=queue.module.js.map