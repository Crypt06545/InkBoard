// src/queue/processors/email.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailerService } from '../../common/mailer/mailer.service.js';

interface VerificationEmailJobData {
  email: string;
  link: string;
}

interface OtpEmailJobData {
  email: string;
  otp: string;
}

@Processor('email-queue')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailerService: MailerService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job: ${job.name} (id: ${job.id})`);

    switch (job.name) {
      case 'send-verification': {
        const data = job.data as VerificationEmailJobData;
        await this.mailerService.sendVerificationEmail(data.email, data.link);
        break;
      }

      case 'send-otp': {
        const data = job.data as OtpEmailJobData;
        await this.mailerService.sendOtpEmail(data.email, data.otp);
        break;
      }

      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }
}
