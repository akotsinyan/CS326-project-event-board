import { Ok, Err, type Result } from "../lib/result";
import { UnexpectedDependencyError, type AuthError } from "./errors";
import type { IUserRepository } from "./UserRepository";
import type { IUserRecord } from "./User";
import type { UserRole } from "./User";
import { getPrismaClient } from "../lib/prisma";

function toUserRecord(u: {
  id: string;
  email: string;
  displayName: string;
  role: string;
  passwordHash: string;
}): IUserRecord {
  return { ...u, role: u.role as UserRole };
}

class PrismaUserRepository implements IUserRepository {
  private get prisma() {
    return getPrismaClient();
  }

  async findByEmail(email: string): Promise<Result<IUserRecord | null, AuthError>> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      return Ok(user ? toUserRecord(user) : null);
    } catch {
      return Err(UnexpectedDependencyError("Unable to find user by email."));
    }
  }

  async findById(id: string): Promise<Result<IUserRecord | null, AuthError>> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });
      return Ok(user ? toUserRecord(user) : null);
    } catch {
      return Err(UnexpectedDependencyError("Unable to find user by ID."));
    }
  }

  async listUsers(): Promise<Result<IUserRecord[], AuthError>> {
    try {
      const users = await this.prisma.user.findMany();
      return Ok(users.map(toUserRecord));
    } catch {
      return Err(UnexpectedDependencyError("Unable to list users."));
    }
  }

  async createUser(user: IUserRecord): Promise<Result<IUserRecord, AuthError>> {
    try {
      const created = await this.prisma.user.create({ data: user });
      return Ok(toUserRecord(created));
    } catch {
      return Err(UnexpectedDependencyError("Unable to create user."));
    }
  }

  async deleteUser(id: string): Promise<Result<boolean, AuthError>> {
    try {
      await this.prisma.user.delete({ where: { id } });
      return Ok(true);
    } catch {
      return Ok(false);
    }
  }
}

export function CreatePrismaUserRepository(): IUserRepository {
  return new PrismaUserRepository();
}
