var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
import { Catch, HttpException, HttpStatus, Logger, } from '@nestjs/common';
import { MongooseError } from 'mongoose';
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    logger = new Logger(AllExceptionsFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Something went wrong. Please try again.';
        if (exception instanceof HttpException) {
            statusCode = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            }
            else if (typeof exceptionResponse === 'object' &&
                exceptionResponse !== null &&
                'message' in exceptionResponse) {
                const errorResponse = exceptionResponse;
                message = errorResponse.message ?? exception.message;
            }
            else {
                message = exception.message;
            }
        }
        else if (exception instanceof MongooseError &&
            exception.name === 'ValidationError') {
            statusCode = HttpStatus.BAD_REQUEST;
            message = exception.message;
        }
        else if (typeof exception === 'object' &&
            exception !== null &&
            'code' in exception &&
            exception.code === 11000) {
            statusCode = HttpStatus.CONFLICT;
            message = 'This value already exists.';
        }
        if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(exception instanceof Error ? exception.stack : exception);
        }
        response.status(statusCode).json({
            success: false,
            message,
            statusCode,
        });
    }
};
AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    Catch()
], AllExceptionsFilter);
export { AllExceptionsFilter };
//# sourceMappingURL=all-exceptions.filter.js.map