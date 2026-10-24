import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { getSchema, type SubmitOfferForm, type SubmissionType, type UploadMode } from '../client/src/lib/offer-form-schema';
import { createCompanySchema, decideMembershipRequestSchema, createOfferSchema } from '../shared/schema';

const options = { fields: {}, shouldUseNativeValidation: false, criteriaMode: 'all' as const };

describe('Zod 4 form and API compatibility', () => {
  const cases: [SubmissionType, UploadMode, boolean, SubmitOfferForm, string][] = [
    ['quote_only', 'separate', false, { quotePrice: 10 }, 'quotePrice'],
    ['video_only', 'separate', false, { videoUrl: 'https://example.com/video' }, 'videoUrl'],
    ['tech_fin_proposal', 'separate', false, { technicalFileUrl: '/objects/uploads/technical', financialFileUrl: '/objects/uploads/financial' }, 'financialFileUrl'],
    ['tech_fin_proposal', 'combined', false, { combinedFileUrl: '/objects/uploads/combined' }, 'combinedFileUrl'],
    ['tech_fin_with_video', 'separate', true, { technicalFileUrl: '/objects/uploads/technical', financialFileUrl: '/objects/uploads/financial', videoUrl: 'https://example.com/video' }, 'videoUrl'],
    ['tech_fin_with_video', 'combined', true, { combinedFileUrl: '/objects/uploads/combined', videoUrl: 'https://example.com/video' }, 'videoUrl'],
    ['tech_fin_with_video', 'combined', false, { combinedFileUrl: '/objects/uploads/combined' }, 'combinedFileUrl'],
  ];
  it.each(cases)('validates %s / %s / videoRequired=%s before submission', async (type, mode, required, valid, missing) => {
    const resolve = zodResolver(getSchema(type, required, mode));
    const good = await resolve(valid, undefined, options);
    expect(good.errors).toEqual({});
    expect(good.values).toEqual(valid);
    const invalid = { ...valid };
    delete invalid[missing as keyof SubmitOfferForm];
    const bad = await resolve(invalid, undefined, options);
    expect(bad.errors).toHaveProperty(missing);
    expect(bad.values).toEqual({});
  });
  it('preserves localized field errors in the form resolver', async () => {
    for (const message of ['Company name is required', 'اسم الشركة مطلوب']) {
      const result = await zodResolver(z.object({ name: z.string().min(2, message) }))({ name: '' }, undefined, options);
      expect(result.errors.name?.message).toBe(message);
      expect(result.values).toEqual({});
    }
  });
  it('keeps custom enum messages and the company default', () => {
    expect(createCompanySchema.parse({ name: 'Acme' }).accountType).toBe('company');
    const company = createCompanySchema.safeParse({ name: 'Acme', category: 'not-a-category' });
    expect(company.success).toBe(false);
    if (!company.success) expect(company.error.issues[0].message).toBe('Please select a valid category');
    const decision = decideMembershipRequestSchema.safeParse({ decision: 'pending' });
    expect(decision.success).toBe(false);
    if (!decision.success) expect(decision.error.issues[0].message).toBe("Decision must be 'approved' or 'rejected'");
  });
  it('keeps server-owned offer fields out of parsed input', () => {
    expect(createOfferSchema.parse({ quotePrice: 100, status: 'accepted', companyId: 'foreign', decidedBy: 'attacker' })).toEqual({ quotePrice: 100 });
    expect(createOfferSchema.safeParse({ quotePrice: '100' }).success).toBe(false);
  });
});
