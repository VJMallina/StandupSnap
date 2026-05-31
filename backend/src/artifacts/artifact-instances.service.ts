import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ArtifactInstance } from '../entities/artifact-instance.entity';
import { ArtifactVersion } from '../entities/artifact-version.entity';
import { CreateArtifactInstanceDto } from './dto/create-artifact-instance.dto';
import { UpdateArtifactInstanceDto } from './dto/update-artifact-instance.dto';
import { CreateArtifactVersionDto } from './dto/create-artifact-version.dto';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class ArtifactInstancesService {
  constructor(private tenantService: TenantService) {}

  async create(createDto: CreateArtifactInstanceDto, projectId: string, userId: string): Promise<ArtifactInstance> {
    const [instanceRepo, versionRepo] = await Promise.all([
      this.tenantService.getRepository(ArtifactInstance),
      this.tenantService.getRepository(ArtifactVersion),
    ]);

    const instance = instanceRepo.create({ ...createDto, projectId, createdById: userId });
    const savedInstance = await instanceRepo.save(instance);

    const initialVersion = versionRepo.create({
      instanceId: savedInstance.id,
      versionNumber: '1.0',
      data: {},
      changeSummary: 'Initial version',
      isMajorVersion: true,
      createdById: userId,
    });

    const savedVersion = await versionRepo.save(initialVersion);
    savedInstance.currentVersionId = savedVersion.id;
    return instanceRepo.save(savedInstance);
  }

  async findByProject(projectId: string): Promise<ArtifactInstance[]> {
    const instanceRepo = await this.tenantService.getRepository(ArtifactInstance);
    return instanceRepo.find({
      where: { projectId },
      relations: ['template', 'currentVersion', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ArtifactInstance> {
    const instanceRepo = await this.tenantService.getRepository(ArtifactInstance);
    const instance = await instanceRepo.findOne({
      where: { id },
      relations: ['template', 'currentVersion', 'createdBy', 'project'],
    });
    if (!instance) throw new NotFoundException(`Artifact instance with ID ${id} not found`);
    return instance;
  }

  async update(id: string, updateDto: UpdateArtifactInstanceDto): Promise<ArtifactInstance> {
    const instanceRepo = await this.tenantService.getRepository(ArtifactInstance);
    const instance = await this.findOne(id);
    Object.assign(instance, updateDto);
    return instanceRepo.save(instance);
  }

  async remove(id: string): Promise<void> {
    const instanceRepo = await this.tenantService.getRepository(ArtifactInstance);
    const instance = await this.findOne(id);
    await instanceRepo.remove(instance);
  }

  async updateCurrentVersionData(instanceId: string, data: any): Promise<ArtifactVersion> {
    const versionRepo = await this.tenantService.getRepository(ArtifactVersion);
    const instance = await this.findOne(instanceId);

    if (!instance.currentVersionId) throw new NotFoundException('No current version found for this instance');

    await versionRepo.update(instance.currentVersionId, { data });
    return this.getVersion(instance.currentVersionId);
  }

  async createVersion(instanceId: string, createVersionDto: CreateArtifactVersionDto, userId: string): Promise<ArtifactVersion> {
    const versionRepo = await this.tenantService.getRepository(ArtifactVersion);
    const instanceRepo = await this.tenantService.getRepository(ArtifactInstance);

    await this.findOne(instanceId);

    const versions = await this.getVersions(instanceId);
    const nextVersion = this.calculateNextVersion(versions, createVersionDto.isMajorVersion || false);

    const version = versionRepo.create({
      instanceId,
      versionNumber: nextVersion,
      ...createVersionDto,
      createdById: userId,
    });

    const savedVersion = await versionRepo.save(version);
    await instanceRepo.update(instanceId, { currentVersionId: savedVersion.id });
    return savedVersion;
  }

  async getVersions(instanceId: string): Promise<ArtifactVersion[]> {
    const versionRepo = await this.tenantService.getRepository(ArtifactVersion);
    return versionRepo.find({
      where: { instanceId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async getVersion(versionId: string): Promise<ArtifactVersion> {
    const versionRepo = await this.tenantService.getRepository(ArtifactVersion);
    const version = await versionRepo.findOne({
      where: { id: versionId },
      relations: ['createdBy', 'instance'],
    });
    if (!version) throw new NotFoundException(`Version with ID ${versionId} not found`);
    return version;
  }

  async restoreVersion(instanceId: string, versionId: string, userId: string): Promise<ArtifactVersion> {
    const [instanceRepo, versionRepo] = await Promise.all([
      this.tenantService.getRepository(ArtifactInstance),
      this.tenantService.getRepository(ArtifactVersion),
    ]);

    const instance = await this.findOne(instanceId);
    const versionToRestore = await this.getVersion(versionId);

    if (versionToRestore.instanceId !== instanceId) throw new ForbiddenException('Version does not belong to this instance');

    console.log('Restoring version:', versionToRestore.versionNumber);
    console.log('Data to restore:', versionToRestore.data);

    const versions = await this.getVersions(instanceId);
    const nextVersion = this.calculateNextVersion(versions, false);

    const restoredVersion = versionRepo.create({
      instanceId,
      versionNumber: nextVersion,
      data: versionToRestore.data,
      changeSummary: `Restored from version ${versionToRestore.versionNumber}`,
      isMajorVersion: false,
      createdById: userId,
    });

    const savedVersion = await versionRepo.save(restoredVersion);
    console.log('Saved restored version:', savedVersion.versionNumber);
    console.log('Saved version ID:', savedVersion.id);
    console.log('Saved version data:', savedVersion.data);

    instance.currentVersionId = savedVersion.id;
    await instanceRepo.save(instance);
    console.log('Updated instance currentVersionId to:', instance.currentVersionId);

    return savedVersion;
  }

  private calculateNextVersion(versions: ArtifactVersion[], isMajor: boolean): string {
    if (versions.length === 0) return '1.0';

    const latestVersion = versions[0].versionNumber;
    const [major, minor] = latestVersion.split('.').map(Number);
    return isMajor ? `${major + 1}.0` : `${major}.${minor + 1}`;
  }
}
