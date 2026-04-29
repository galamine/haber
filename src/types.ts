import type { User } from '@prisma/client';
import type { Request } from 'express';

export interface AuthRequest extends Request {
  user?: User | Express.User;
}

export interface PaginateQuery extends Request {
  query: {
    name?: string;
    role?: string;
    sortBy?: string;
    limit?: string;
    page?: string;
  };
}
