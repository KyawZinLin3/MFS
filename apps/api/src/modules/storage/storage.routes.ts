import { randomUUID } from 'node:crypto';
import { S3Client, CreateBucketCommand, GetObjectCommand, HeadBucketCommand, PutBucketCorsCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma.js';
import { AppError } from '../../shared/errors.js';
import { assertPermission, authenticate } from '../../shared/rbac.js';

const endpoint = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
const publicEndpoint = process.env.S3_PUBLIC_ENDPOINT ?? endpoint;
const bucket = process.env.S3_BUCKET ?? 'mfs-private';
const credentials = { accessKeyId: process.env.S3_ACCESS_KEY ?? 'mfs-local-access', secretAccessKey: process.env.S3_SECRET_KEY ?? 'mfs-local-secret-change-this' };
const region = process.env.S3_REGION ?? 'us-east-1';
const s3 = new S3Client({ region, endpoint, forcePathStyle: true, credentials });
const s3Public = new S3Client({ region, endpoint: publicEndpoint, forcePathStyle: true, credentials });

export async function ensureStorageBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      const status = typeof error === 'object' && error !== null && '$metadata' in error
        ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
        : undefined;
      if (name !== 'BucketAlreadyExists' && name !== 'BucketAlreadyOwnedByYou' && status !== 409) throw error;
    }
  }
  const origins = (process.env.WEB_ORIGIN ?? 'http://localhost:8080').split(',').map((origin) => origin.trim()).filter(Boolean);
  await s3.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: [{ AllowedOrigins: origins, AllowedMethods: ['PUT', 'GET', 'HEAD'], AllowedHeaders: ['*'], ExposeHeaders: ['ETag'], MaxAgeSeconds: 3600 }] } }));
}

const uploadSchema = z.object({ filename: z.string().trim().min(1).max(180), contentType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'text/csv']), size: z.number().int().positive().max(10 * 1024 * 1024), companyId: z.string().optional(), branchId: z.string().optional() });

export async function storageRoutes(app: FastifyInstance) {
  app.post('/upload-url', { preHandler: authenticate }, async (request) => {
    assertPermission(request, 'documents:write');
    const parsed = uploadSchema.safeParse(request.body);
    if (!parsed.success) throw new AppError('Use a PDF, PNG, JPG, or CSV file up to 10 MB.', 400, 'VALIDATION_ERROR');
    const input = parsed.data;
    const companyId = request.user.role === 'PLATFORM_ADMIN' ? input.companyId : request.user.companyId;
    const branchId = input.branchId;
    if (!companyId || !branchId) throw new AppError('Choose a company and branch for this file.', 400, 'SCOPE_REQUIRED');
    if (request.user.role !== 'PLATFORM_ADMIN' && request.user.role !== 'COMPANY_ADMIN' && !request.user.branchIds.includes(branchId)) throw new AppError('This branch is outside your access scope.', 403, 'OUT_OF_SCOPE');
    const branch = await prisma.branch.findFirst({ where: { id: branchId, companyId } });
    if (!branch) throw new AppError('The selected branch was not found in this company.', 404, 'BRANCH_NOT_FOUND');
    const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
    const objectKey = `${companyId}/${branchId}/${randomUUID()}-${safeName}`;
    const document = await prisma.document.create({ data: { companyId, branchId, uploadedBy: request.user.sub, objectKey, filename: input.filename, contentType: input.contentType, size: input.size } });
    const uploadUrl = await getSignedUrl(s3Public, new PutObjectCommand({ Bucket: bucket, Key: objectKey, ContentType: input.contentType }), { expiresIn: 300 });
    return { documentId: document.id, uploadUrl, expiresIn: 300, method: 'PUT', headers: { 'Content-Type': input.contentType } };
  });

  app.get('/:documentId/download-url', { preHandler: authenticate }, async (request) => {
    assertPermission(request, 'documents:read');
    const params = z.object({ documentId: z.string() }).parse(request.params);
    const document = await prisma.document.findUnique({ where: { id: params.documentId } });
    if (!document || (request.user.role !== 'PLATFORM_ADMIN' && document.companyId !== request.user.companyId)) throw new AppError('File not found.', 404, 'NOT_FOUND');
    if (request.user.role !== 'PLATFORM_ADMIN' && request.user.role !== 'COMPANY_ADMIN' && !request.user.branchIds.includes(document.branchId)) throw new AppError('File not found.', 404, 'NOT_FOUND');
    const downloadUrl = await getSignedUrl(s3Public, new GetObjectCommand({ Bucket: bucket, Key: document.objectKey, ResponseContentDisposition: `attachment; filename="${document.filename.replace(/["\\]/g, '_')}"` }), { expiresIn: 300 });
    return { downloadUrl, expiresIn: 300 };
  });
}
