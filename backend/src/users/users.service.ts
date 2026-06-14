import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { OrgUser } from '../entities/org-user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(OrgUser)
    private orgUserRepository: Repository<OrgUser>,
  ) {}

  async findByRole(roleName: string): Promise<User[]> {
    return this.usersRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.name = :roleName', { roleName })
      .select(['user.id', 'user.email', 'user.name', 'user.username'])
      .orderBy('user.name', 'ASC')
      .getMany();
  }

  async findByOrg(organizationId: string): Promise<User[]> {
    const orgUsers = await this.orgUserRepository.find({
      where: { organizationId, isActive: true, deletedAt: IsNull() },
      relations: ['user'],
    });
    return orgUsers
      .filter((ou) => ou.user?.isActive)
      .map((ou) => ({
        id: ou.user.id,
        email: ou.user.email,
        name: ou.user.name,
        username: ou.user.username,
      } as User))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'email', 'name', 'username'],
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<User> {
    return this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'username'],
    });
  }
}
