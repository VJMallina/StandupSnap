import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Invitation, InvitationStatus } from '../entities/invitation.entity';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Injectable()
export class InvitationService {
  constructor(
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  /**
   * Generate a secure unique token for invitations
   */
  private generateUniqueToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new invitation
   */
  async createInvitation(
    createInvitationDto: CreateInvitationDto,
  ): Promise<Invitation> {
    const { email, assignedRole, projectId } = createInvitationDto;

    // Check if there's already a pending invitation for this email
    const existingInvitation = await this.invitationRepository.findOne({
      where: {
        email,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throw new BadRequestException(
        'A pending invitation already exists for this email.',
      );
    }

    // Verify project exists if projectId is provided
    let project = null;
    if (projectId) {
      project = await this.projectRepository.findOne({
        where: { id: projectId },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }
    }

    // Generate token and set expiration (7 days from now)
    const token = this.generateUniqueToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const invitation = this.invitationRepository.create({
      email,
      assignedRole,
      token,
      expiresAt,
      project,
      status: InvitationStatus.PENDING,
    });

    return await this.invitationRepository.save(invitation);
  }

  /**
   * Validate an invitation token
   */
  async validateToken(token: string): Promise<Invitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['project'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('This invitation has already been used');
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      // Mark as expired
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      throw new BadRequestException('This invitation has expired');
    }

    return invitation;
  }

  /**
   * Get invitation by email (for checking during registration)
   */
  async getInvitationByEmail(email: string): Promise<Invitation | null> {
    const invitation = await this.invitationRepository.findOne({
      where: {
        email,
        status: InvitationStatus.PENDING,
      },
      relations: ['project'],
    });

    // Check if expired
    if (invitation && invitation.expiresAt && invitation.expiresAt < new Date()) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      return null;
    }

    return invitation;
  }

  /**
   * Mark invitation as accepted
   */
  async markAsAccepted(invitationId: string): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    invitation.status = InvitationStatus.ACCEPTED;
    await this.invitationRepository.save(invitation);
  }

  /**
   * Get all invitations (optionally filter by project)
   */
  async getAllInvitations(projectId?: string): Promise<Invitation[]> {
    const query = this.invitationRepository
      .createQueryBuilder('invitation')
      .leftJoinAndSelect('invitation.project', 'project')
      .orderBy('invitation.createdAt', 'DESC');

    if (projectId) {
      query.where('invitation.project.id = :projectId', { projectId });
    }

    return await query.getMany();
  }

  /**
   * Revoke an invitation
   */
  async revokeInvitation(invitationId: string): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Mark as expired instead of deleting (for audit trail)
    invitation.status = InvitationStatus.EXPIRED;
    await this.invitationRepository.save(invitation);
  }

  /**
   * Get invitation by ID
   */
  async getInvitationById(invitationId: string): Promise<Invitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['project'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return invitation;
  }
}
