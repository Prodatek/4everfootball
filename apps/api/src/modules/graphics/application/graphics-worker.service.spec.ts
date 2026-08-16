import { Test } from '@nestjs/testing';
import { GraphicsWorkerService } from './graphics-worker.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SatoriRendererService } from '../infrastructure/satori-renderer.service';
import { ImageEmbedService } from '../infrastructure/image-embed.service';
import { S3StorageService } from '../../media/infrastructure/s3-storage.service';

function fakePrisma() {
  return {
    graphic: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
}

const BASE_GRAPHIC = {
  id: 'g1',
  template: 'GOAL_ALERT',
  format: 'SQUARE',
  data: { scorerName: 'X' },
  attempts: 0,
  competition: null,
};

describe('GraphicsWorkerService', () => {
  let service: GraphicsWorkerService;
  let prisma: ReturnType<typeof fakePrisma>;
  let renderer: jest.Mocked<SatoriRendererService>;
  let imageEmbed: jest.Mocked<ImageEmbedService>;
  let s3: jest.Mocked<S3StorageService>;

  beforeEach(async () => {
    prisma = fakePrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GraphicsWorkerService,
        { provide: PrismaService, useValue: prisma },
        { provide: SatoriRendererService, useValue: { render: jest.fn() } },
        {
          provide: ImageEmbedService,
          useValue: { prepare: jest.fn((d) => d) },
        },
        {
          provide: S3StorageService,
          useValue: { putObject: jest.fn(), publicUrlFor: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(GraphicsWorkerService);
    renderer = moduleRef.get(SatoriRendererService);
    imageEmbed = moduleRef.get(ImageEmbedService);
    s3 = moduleRef.get(S3StorageService);
  });

  it('processes each PENDING graphic returned by the batch query', async () => {
    prisma.graphic.findMany.mockResolvedValue([{ id: 'g1' }, { id: 'g2' }]);
    prisma.graphic.updateMany.mockResolvedValue({ count: 0 }); // both already claimed elsewhere — simplest path

    await service.processPending();

    expect(prisma.graphic.updateMany).toHaveBeenCalledTimes(2);
  });

  it('skips rendering when another tick already claimed the row (updateMany count 0)', async () => {
    prisma.graphic.findMany.mockResolvedValue([{ id: 'g1' }]);
    prisma.graphic.updateMany.mockResolvedValue({ count: 0 });

    await service.processPending();

    expect(prisma.graphic.findUnique).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
  });

  it('renders, uploads, and marks READY on success', async () => {
    prisma.graphic.findMany.mockResolvedValue([{ id: 'g1' }]);
    prisma.graphic.updateMany.mockResolvedValue({ count: 1 });
    prisma.graphic.findUnique.mockResolvedValue(BASE_GRAPHIC);
    imageEmbed.prepare.mockResolvedValue({
      scorerName: 'X',
      scorerLogoDataUri: null,
    });
    renderer.render.mockResolvedValue(Buffer.from('png-bytes'));
    s3.publicUrlFor.mockReturnValue(
      'https://cdn.example.com/graphics/goal_alert/g1.png',
    );

    await service.processPending();

    expect(s3.putObject).toHaveBeenCalledWith(
      'graphics/goal_alert/g1.png',
      expect.any(Buffer),
      'image/png',
    );
    expect(prisma.graphic.update).toHaveBeenCalledWith({
      where: { id: 'g1' },
      data: {
        status: 'READY',
        mediaKey: 'graphics/goal_alert/g1.png',
        publicUrl: 'https://cdn.example.com/graphics/goal_alert/g1.png',
        readyAt: expect.any(Date),
      },
    });
  });

  it('re-queues as PENDING with an incremented attempt count on a render failure below the max', async () => {
    prisma.graphic.findMany.mockResolvedValue([{ id: 'g1' }]);
    prisma.graphic.updateMany.mockResolvedValue({ count: 1 });
    prisma.graphic.findUnique.mockResolvedValue({
      ...BASE_GRAPHIC,
      attempts: 1,
    });
    renderer.render.mockRejectedValue(new Error('font load failed'));

    await service.processPending();

    expect(prisma.graphic.update).toHaveBeenCalledWith({
      where: { id: 'g1' },
      data: {
        status: 'PENDING',
        attempts: 2,
        errorMessage: 'font load failed',
      },
    });
  });

  it('marks FAILED once attempts reach the max', async () => {
    prisma.graphic.findMany.mockResolvedValue([{ id: 'g1' }]);
    prisma.graphic.updateMany.mockResolvedValue({ count: 1 });
    prisma.graphic.findUnique.mockResolvedValue({
      ...BASE_GRAPHIC,
      attempts: 2,
    });
    renderer.render.mockRejectedValue(new Error('still broken'));

    await service.processPending();

    expect(prisma.graphic.update).toHaveBeenCalledWith({
      where: { id: 'g1' },
      data: { status: 'FAILED', attempts: 3, errorMessage: 'still broken' },
    });
  });
});
