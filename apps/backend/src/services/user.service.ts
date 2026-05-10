import type { Role } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';

interface PaginateOptions {
  sortBy?: string;
  limit?: number;
  page?: number;
}

interface QueryResult {
  results: UserShape[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface CreateUserBody {
  name: string;
  email: string;
  role: Role;
  tenantId?: string | null;
}

interface UserShape {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string | null;
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
} as const;

const createUser = async (userBody: CreateUserBody): Promise<UserShape> => {
  const existingUser = await prisma.user.findUnique({ where: { email: userBody.email } });
  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  return prisma.user.create({
    data: {
      name: userBody.name,
      email: userBody.email,
      role: userBody.role,
      tenantId: userBody.tenantId ?? null,
    },
    select: userSelect,
  });
};

const queryUsers = async (filter: Record<string, unknown>, options: PaginateOptions): Promise<QueryResult> => {
  const { sortBy, limit = 10, page = 1 } = options;
  const skip = (page - 1) * Number(limit);

  const orderBy: Record<string, 'asc' | 'desc'>[] = sortBy
    ? sortBy.split(',').map((criterion) => {
        const [field, order] = criterion.split(':');
        return { [field]: order === 'desc' ? 'desc' : 'asc' };
      })
    : [{ createdAt: 'asc' }];

  const where: Record<string, unknown> = {};
  if (filter.name) where.name = { contains: String(filter.name), mode: 'insensitive' };
  if (filter.role) where.role = filter.role;

  const [results, totalResults] = await Promise.all([
    prisma.user.findMany({ where, skip, take: Number(limit), orderBy, select: userSelect }),
    prisma.user.count({ where }),
  ]);

  return {
    results,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(totalResults / Number(limit)),
    totalResults,
  };
};

const getUserById = async (id: string): Promise<UserShape | null> =>
  prisma.user.findUnique({ where: { id }, select: userSelect });

const getUserByEmail = async (email: string): Promise<UserShape | null> =>
  prisma.user.findUnique({ where: { email }, select: userSelect });

const updateUserById = async (
  userId: string,
  updateBody: Partial<Pick<CreateUserBody, 'name' | 'email'>>
): Promise<UserShape> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && updateBody.email !== user.email) {
    const existingUser = await prisma.user.findUnique({ where: { email: updateBody.email } });
    if (existingUser) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
    }
  }
  return prisma.user.update({ where: { id: userId }, data: updateBody, select: userSelect });
};

const deleteUserById = async (userId: string): Promise<UserShape> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return prisma.user.delete({ where: { id: userId }, select: userSelect });
};

export const userService = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
};
