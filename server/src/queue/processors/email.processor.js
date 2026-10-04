var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailProcessor_1;
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { MailerService } from '../../src/common/mailer/mailer.service.js';
let EmailProcessor = EmailProcessor_1 = class EmailProcessor extends WorkerHost {
    mailerService;
    logger = new Logger(EmailProcessor_1.name);
    constructor(mailerService) {
        super();
        this.mailerService = mailerService;
    }
    async process(job) {
        this.logger.log(`Processing job: ${job.name} (id: ${job.id})`);
        switch (job.name) {
            case 'send-verification': {
                const data = job.data;
                await this.mailerService.sendVerificationEmail(data.email, data.link);
                break;
            }
            case 'send-otp': {
                const data = job.data;
                await this.mailerService.sendOtpEmail(data.email, data.otp);
                break;
            }
            default:
                this.logger.warn(`Unknown job type: ${job.name}`);
        }
    }
};
EmailProcessor = EmailProcessor_1 = __decorate([
    Processor('email-queue'),
    __metadata("design:paramtypes", [MailerService])
], EmailProcessor);
export { EmailProcessor };
//# sourceMappingURL=email.processor.js.map