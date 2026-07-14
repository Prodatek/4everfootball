import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MediaService } from './media.service';
import { MEDIA_REPOSITORY } from '../domain/media.repository';
import type { MediaRepository } from '../domain/media.repository';
import { S3StorageService } from '../infrastructure/s3-storage.service';

describe('MediaService', () => {
  let service: MediaService;
  let repository: jest.Mocked<MediaRepository>;
  let storage: jest.Mocked<S3StorageService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: MEDIA_REPOSITORY,
          useValue: {
            findMany: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: S3StorageService,
          useValue: {
            createUploadUrl: jest.fn(),
            publicUrlFor: jest.fn(),
            deleteObject: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(MediaService);
    repository = moduleRef.get(MEDIA_REPOSITORY);
    storage = moduleRef.get(S3StorageService);
  });

  describe('requestUploadUrl', () => {
    it('rejects an unsupported mime type', async () => {
      await expect(
        service.requestUploadUrl({
          filename: 'malware.exe',
          mimeType: 'application/x-msdownload',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.createUploadUrl).not.toHaveBeenCalled();
    });

    it('generates a key that preserves the file extension and is safe for a URL', async () => {
      storage.createUploadUrl.mockResolvedValue(
        'https://upload.example/signed',
      );
      storage.publicUrlFor.mockReturnValue('https://cdn.example/key');

      const result = await service.requestUploadUrl({
        filename: 'Team Crest #1 (Final).PNG',
        mimeType: 'image/png',
      });

      expect(result.key).toMatch(/^[0-9a-f-]{36}-team-crest-1-final\.PNG$/i);
      expect(storage.createUploadUrl).toHaveBeenCalledWith(
        result.key,
        'image/png',
      );
    });
  });

  describe('confirmUpload', () => {
    it('rejects an unsupported mime type', async () => {
      await expect(
        service.confirmUpload({
          key: 'abc-file.exe',
          filename: 'file.exe',
          mimeType: 'application/x-msdownload',
          sizeBytes: 100,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('creates a media record with the derived kind and uploader', async () => {
      storage.publicUrlFor.mockReturnValue('https://cdn.example/abc-photo.jpg');
      repository.create.mockResolvedValue({
        toPublic: () => ({ id: 'media-1', kind: 'IMAGE' }),
      } as never);

      const result = await service.confirmUpload(
        {
          key: 'abc-photo.jpg',
          filename: 'photo.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 2048,
        },
        'user-1',
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'abc-photo.jpg',
          kind: 'IMAGE',
          uploadedById: 'user-1',
        }),
      );
      expect(result).toEqual({ id: 'media-1', kind: 'IMAGE' });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException for a missing media item', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(storage.deleteObject).not.toHaveBeenCalled();
    });

    it('deletes the S3 object before deleting the database record', async () => {
      repository.findById.mockResolvedValue({
        id: 'media-1',
        key: 'abc-photo.jpg',
      } as never);
      const calls: string[] = [];
      storage.deleteObject.mockImplementation(async () => {
        calls.push('s3');
      });
      repository.delete.mockImplementation(async () => {
        calls.push('db');
      });

      await service.remove('media-1');

      expect(storage.deleteObject).toHaveBeenCalledWith('abc-photo.jpg');
      expect(repository.delete).toHaveBeenCalledWith('media-1');
      expect(calls).toEqual(['s3', 'db']);
    });
  });
});
