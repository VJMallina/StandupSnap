import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByRole(role: string): Promise<User[]> {
    return this.usersRepository.find({
      where: { role },
      select: ['id', 'email', 'firstName', 'lastName', 'role'],
      order: { firstName: 'ASC', lastName: 'ASC' },
    });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'email', 'firstName', 'lastName', 'role'],
      order: { firstName: 'ASC', lastName: 'ASC' },
    });
  }

  async findOne(id: string): Promise<User> {
    return this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'firstName', 'lastName', 'role'],
    });
  }
}
