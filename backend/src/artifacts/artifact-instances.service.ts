import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArtifactInstance } from '../entities/artifact-instance.entity';
import { ArtifactVersion } from '../entities/artifact-version.entity';
import { CreateArtifactInstanceDto } from './dto/create-artifact-instance.dto';
import { UpdateArtifactInstanceDto } from './dto/update-artifact-instance.dto';
import { CreateArtifactVersionDto } from './dto/create-artifact-version.dto';

@Injectable()
export class ArtifactInstancesService {
  constructor(
    @InjectRepository(ArtifactInstance)
    private artifactInstancesRepository: Repository<ArtifactInstance>,
    @InjectRepository(ArtifactVersion)
    private artifactVersionsRepository: Repository<ArtifactVersion>,
  ) {}

  async create(
    createDto: CreateArtifactInstanceDto,
    projectId: string,
    userId: string,
  ): Promise<ArtifactInstance> {
    const instance = this.artifactInstancesRepository.create({
      ...createDto,
      projectId,
      createdById: userId,
    });

    const savedInstance = await this.artifactInstancesRepository.save(instance);

    // Create initial version (v1.0) with empty data
    const initialVersion = this.artifactVersionsRepository.create({
      instanceId: savedInstance.id,
      versionNumber: '1.0',
      data: {},
      changeSummary: 'Initial version',
      isMajorVersion: true,
      createdById: userId,
    });

    const savedVersion = await this.artifactVersionsRepository.save(initialVersion);

    // Update instance with current version
    savedInstance.currentVersionId = savedVersion.id;
    return this.artifactInstancesRepository.save(savedInstance);
  }

  async findByProject(projectId: string): Promise<ArtifactInstance[]> {
    return this.artifactInstancesRepository.find({
      where: { projectId },
      relations: ['template', 'currentVersion', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ArtifactInstance> {
    const instance = await this.artifactInstancesRepository.findOne({
      where: { id },
      relations: ['template', 'currentVersion', 'createdBy', 'project'],
    });

    if (!instance) {
      throw new NotFoundException(`Artifact instance with ID ${id} not found`);
    }

    return instance;
  }

  async update(
    id: string,
    updateDto: UpdateArtifactInstanceDto,
  ): Promise<ArtifactInstance> {
    const instance = await this.findOne(id);
    Object.assign(instance, updateDto);
    return this.artifactInstancesRepository.save(instance);
  }

  async remove(id: string): Promise<void> {
    const instance = await this.findOne(id);
    await this.artifactInstancesRepository.remove(instance);
  }

  // Update current version data without creating new version
  async updateCurrentVersionData(
    instanceId: string,
    data: any,
  ): Promise<ArtifactVersion> {
    const instance = await this.findOne(instanceId);

    if (!instance.currentVersionId) {
      throw new NotFoundException('No current version found for this instance');
    }

    // Update the current version's data directly
    await this.artifactVersionsRepository.update(instance.currentVersionId, {
      data,
    });

    return this.getVersion(instance.currentVersionId);
  }

  // Version management
  async createVersion(
    instanceId: string,
    createVersionDto: CreateArtifactVersionDto,
    userId: string,
  ): Promise<ArtifactVersion> {
    const instance = await this.findOne(instanceId);

    // Calculate next version number
    const versions = await this.getVersions(instanceId);
    const nextVersion = this.calculateNextVersion(
      versions,
      createVersionDto.isMajorVersion || false,
    );

    const version = this.artifactVersionsRepository.create({
      instanceId,
      versionNumber: nextVersion,
      ...createVersionDto,
      createdById: userId,
    });

    const savedVersion = await this.artifactVersionsRepository.save(version);

    // Update instance current version using direct update query
    await this.artifactInstancesRepository.update(instanceId, {
      currentVersionId: savedVersion.id,
    });

    return savedVersion;
  }

  async getVersions(instanceId: string): Promise<ArtifactVersion[]> {
    return this.artifactVersionsRepository.find({
      where: { instanceId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async getVersion(versionId: string): Promise<ArtifactVersion> {
    const version = await this.artifactVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['createdBy', 'instance'],
    });

    if (!version) {
      throw new NotFoundException(`Version with ID ${versionId} not found`);
    }

    return version;
  }

  async restoreVersion(
    instanceId: string,
    versionId: string,
    userId: string,
  ): Promise<ArtifactVersion> {
    const instance = await this.findOne(instanceId);
    const versionToRestore = await this.getVersion(versionId);

    if (versionToRestore.instanceId !== instanceId) {
      throw new ForbiddenException('Version does not belong to this instance');
    }

    console.log('Restoring version:', versionToRestore.versionNumber);
    console.log('Data to restore:', versionToRestore.data);

    // Create new version with restored data
    const versions = await this.getVersions(instanceId);
    const nextVersion = this.calculateNextVersion(versions, false);

    const restoredVersion = this.artifactVersionsRepository.create({
      instanceId,
      versionNumber: nextVersion,
      data: versionToRestore.data,
      changeSummary: `Restored from version ${versionToRestore.versionNumber}`,
      isMajorVersion: false,
      createdById: userId,
    });

    const savedVersion = await this.artifactVersionsRepository.save(restoredVersion);
    console.log('Saved restored version:', savedVersion.versionNumber);
    console.log('Saved version ID:', savedVersion.id);
    console.log('Saved version data:', savedVersion.data);

    // Update instance current version
    instance.currentVersionId = savedVersion.id;
    await this.artifactInstancesRepository.save(instance);
    console.log('Updated instance currentVersionId to:', instance.currentVersionId);

    return savedVersion;
  }

  private calculateNextVersion(
    versions: ArtifactVersion[],
    isMajor: boolean,
  ): string {
    if (versions.length === 0) {
      return '1.0';
    }

    const latestVersion = versions[0].versionNumber;
    const [major, minor] = latestVersion.split('.').map(Number);

    if (isMajor) {
      return `${major + 1}.0`;
    } else {
      return `${major}.${minor + 1}`;
    }
  }
}
