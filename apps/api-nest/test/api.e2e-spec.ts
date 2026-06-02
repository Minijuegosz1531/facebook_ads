import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@app/app.module';

/**
 * End-to-end smoke test using @nestjs/testing + supertest. Drives the full
 * pipeline through real HTTP against an in-memory stub backend.
 */
describe('API (e2e, stub mode)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  it('health', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('clients are seeded', async () => {
    const res = await request(app.getHttpServer()).get('/clients').expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('meta_ad_account_id');
  });

  it('full flow: inspiration → publish (PAUSED) → activate → insights', async () => {
    const clients = (await request(app.getHttpServer()).get('/clients')).body;
    const client = clients[0];

    // 1. start inspiration (background goroutine-like)
    const started = await request(app.getHttpServer())
      .post('/inspiration/search')
      .send({
        client_id: client.id,
        client_name: client.name,
        product: 'café de especialidad',
        description: 'Promocionar café de especialidad colombiano premium tostado',
        objective: 'OUTCOME_SALES',
        country: 'CO',
      })
      .expect(202);
    const jobId = started.body.job_id;

    // 2. poll until ready
    let job: { status: string; generated_images: string[]; generated_copies: unknown[] } | null = null;
    for (let i = 0; i < 50; i++) {
      job = (await request(app.getHttpServer()).get(`/inspiration/${jobId}`)).body;
      if (job!.status === 'ready') break;
      await sleep(20);
    }
    expect(job!.status).toBe('ready');
    expect(job!.generated_images).toHaveLength(5);
    expect(job!.generated_copies).toHaveLength(10);

    // 3. publish
    const published = await request(app.getHttpServer())
      .post('/campaigns/publish-from-job')
      .send({
        job_id: jobId,
        client_id: client.id,
        ad_account_id: client.meta_ad_account_id,
        name: 'Campaña Café Premium',
        objective: 'OUTCOME_SALES',
        budget_type: 'campaign',
        budget_amount: 5000,
        page_id: client.meta_page_id,
        link_url: 'https://shop.example/cafe',
        image_index: 0,
        copy_index: 2,
      })
      .expect(201);
    expect(published.body.status).toBe('PAUSED');
    const campaignId = published.body.id;

    // 4. activate
    const activated = await request(app.getHttpServer())
      .patch(`/campaigns/${campaignId}/status`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    expect(activated.body.status).toBe('ACTIVE');

    // 5. insights
    const insights = await request(app.getHttpServer())
      .get(`/campaigns/${campaignId}/insights`)
      .expect(200);
    expect(insights.body.data).toBeDefined();
  });
});
