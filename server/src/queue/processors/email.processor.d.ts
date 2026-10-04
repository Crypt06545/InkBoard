import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailerService } from '../../src/common/mailer/mailer.service.js';
export declare class EmailProcessor extends WorkerHost {
    private readonly mailerService;
    private readonly logger;
    constructor(mailerService: MailerService);
    process(job: Job): Promise<void>;
}
