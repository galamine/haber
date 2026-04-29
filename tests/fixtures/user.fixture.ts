const bcrypt = require('bcryptjs');
const faker = require('faker');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const password = 'password1';
const salt = bcrypt.genSaltSync(8);
const hashedPassword = bcrypt.hashSync(password, salt);

const userOne = {
  id: crypto.randomUUID(),
  name: faker.name.findName(),
  email: faker.internet.email().toLowerCase(),
  password,
  role: 'user',
  isEmailVerified: false,
};

const userTwo = {
  id: crypto.randomUUID(),
  name: faker.name.findName(),
  email: faker.internet.email().toLowerCase(),
  password,
  role: 'user',
  isEmailVerified: false,
};

const admin = {
  id: crypto.randomUUID(),
  name: faker.name.findName(),
  email: faker.internet.email().toLowerCase(),
  password,
  role: 'admin',
  isEmailVerified: false,
};

const insertUsers = async (users) => {
  const data = users.map((user) => ({ ...user, password: hashedPassword }));
  await prisma.user.createMany({ data });
};

module.exports = {
  userOne,
  userTwo,
  admin,
  insertUsers,
};
