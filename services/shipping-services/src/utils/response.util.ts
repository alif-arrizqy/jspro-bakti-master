import { FastifyReply } from "fastify";

export interface SuccessResponse<T = unknown> {
    success: true;
    message: string;
    data?: T;
}

export interface ErrorResponse {
    success: false;
    message: string;
    errors?: unknown;
}

export class ResponseHelper {
    /**
     * Send success response
     * @param reply Fastify reply object
     * @param message Success message
     * @param data Optional data to include
     * @param statusCode HTTP status code (default: 200)
     */
    static success<T = unknown>(
        reply: FastifyReply,
        message: string,
        data?: T,
        statusCode: number = 200
    ): FastifyReply {
        const response: SuccessResponse<T> = {
            success: true,
            message,
        };

        if (data !== undefined) {
            // Data should already be plain objects from transform functions
            // Fastify will handle serialization automatically
            response.data = data;
        }

        return reply.status(statusCode).send(response);
    }

    /**
     * Send error response
     * @param reply Fastify reply object
     * @param message Error message
     * @param errors Optional error details
     * @param statusCode HTTP status code (default: 400)
     */
    static error(
        reply: FastifyReply,
        message: string,
        errors?: unknown,
        statusCode: number = 400
    ): FastifyReply {
        const response: ErrorResponse = {
            success: false,
            message,
        };

        if (errors !== undefined) {
            response.errors = errors;
        }

        return reply.status(statusCode).send(response);
    }

    /**
     * Send success response with pagination
     * @param reply Fastify reply object
     * @param message Success message
     * @param data Array of data
     * @param pagination Pagination metadata
     * @param statusCode HTTP status code (default: 200)
     */
    static successWithPagination<T = unknown>(
        reply: FastifyReply,
        message: string,
        data: T[],
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        },
        statusCode: number = 200
    ): FastifyReply {
        // Data should already be plain objects from transform functions
        // Only serialize if needed to ensure it's a plain object
        const responseData = {
            items: Array.isArray(data) ? data : [],
            pagination: {
                page: Number(pagination.page),
                limit: Number(pagination.limit),
                total: Number(pagination.total),
                totalPages: Number(pagination.totalPages),
            },
        };
        
        return this.success(
            reply,
            message,
            responseData,
            statusCode
        );
    }

    /**
     * Handle error and send appropriate response
     * @param reply Fastify reply object
     * @param error Error object
     * @param defaultMessage Default error message
     * @param logContext Optional context for logging
     */
    static handleError(
        reply: FastifyReply,
        error: unknown,
        defaultMessage: string,
        logContext?: { logger: any; context: string }
    ): FastifyReply {
        if (logContext) {
            logContext.logger.error({ error }, logContext.context);
        }

        const message = error instanceof Error ? error.message : defaultMessage;
        const statusCode = this.getErrorStatusCode(error, defaultMessage);

        return this.error(reply, message, undefined, statusCode);
    }

    /**
     * Determine appropriate HTTP status code based on error
     */
    private static getErrorStatusCode(error: unknown, defaultMessage: string): number {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes("not found")) {
                return 404;
            }

            if (message.includes("unauthorized") || message.includes("forbidden")) {
                return 403;
            }

            if (message.includes("invalid") || message.includes("validation")) {
                return 400;
            }

            if (message.includes("conflict") || message.includes("already exists")) {
                return 409;
            }
        }

        return 400;
    }
}

