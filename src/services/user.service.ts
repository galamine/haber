import type { User } from '@prisma/client';
import bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';

interface PaginateOptions {
  sortBy?: string;
  populate?: string;
  limit?: number;
  page?: number;
}

interface QueryResult {
  results: any[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface CreateUserBody {
  name: string;
  email: string;
  password: string;
  role?: string;
}

interface UserWithoutPassword {
  id: string;
  name: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const createUser = async (userBody: CreateUserBody): Promise<UserWithoutPassword> => {
  const existingUser = await prisma.user.findUnique({ where: { email: userBody.email } });
  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  const hashedPassword = await bcrypt.hash(userBody.password, 8);
  const user = await prisma.user.create({
    data: {
      name: userBody.name,
      email: userBody.email,
      password: hashedPassword,
      role: userBody.role || 'user',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user;
};

const queryUsers = async (filter: Record<string, unknown>, options: PaginateOptions): Promise<QueryResult> => {
  const { sortBy, limit = 10, page = 1 } = options;
  const skip = (page - 1) * Number(limit);

  const orderBy: Record<string, 'asc' | 'desc'>[] = [];
  if (sortBy) {
    sortBy.split(',').forEach((criterion) => {
      const [field, order] = criterion.split(':');
      orderBy.push({ [field]: order === 'desc' ? 'desc' : 'asc' });
    });
  } else {
    orderBy.push({ createdAt: 'desc' });
  }

  const where: Record<string, unknown> = {};
  if (filter.name) where.name = { contains: String(filter.name), mode: 'insensitive' };
  if (filter.role) where.role = filter.role;

  const [results, totalResults] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    results,
    page,
    limit: Number(limit),
    totalPages: Math.ceil(totalResults / Number(limit)),
    totalResults,
  };
};

const getUserById = async (id: string): Promise<UserWithoutPassword | null> => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

const getUserByEmail = async (email: string): Promise<User | null> => {
  return prisma.user.findUnique({ where: { email } });
};

const updateUserById = async (userId: string, updateBody: Partial<CreateUserBody>): Promise<UserWithoutPassword> => {
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
  const data: Record<string, unknown> = { ...updateBody };
  if (updateBody.password) {
    data.password = await bcrypt.hash(updateBody.password, 8);
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return updated;
};

const deleteUserById = async (userId: string): Promise<UserWithoutPassword> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return prisma.user.delete({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const userService = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
};
