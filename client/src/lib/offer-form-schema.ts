import { z } from "zod";

export type SubmissionType = 'quote_only' | 'tech_fin_proposal' | 'video_only' | 'tech_fin_with_video';
export type UploadMode = 'combined' | 'separate';

const baseSchema = z.object({
  notes: z.string().optional(),
});

const quoteOnlySchema = baseSchema.extend({
  quotePrice: z.number().min(1, "Price quote is required"),
});

const videoOnlySchema = baseSchema.extend({
  videoUrl: z.string().url("Please enter a valid video URL").min(1, "Video URL is required"),
});

const techFinSeparateSchema = baseSchema.extend({
  technicalFileUrl: z.string().min(1, "Technical proposal is required"),
  financialFileUrl: z.string().min(1, "Financial proposal is required"),
});

const techFinCombinedSchema = baseSchema.extend({
  combinedFileUrl: z.string().min(1, "Combined proposal file is required"),
});

const techFinWithVideoSeparateSchema = baseSchema.extend({
  technicalFileUrl: z.string().min(1, "Technical proposal is required"),
  financialFileUrl: z.string().min(1, "Financial proposal is required"),
  videoUrl: z.string().url("Please enter a valid video URL").optional(),
});

const techFinWithVideoCombinedSchema = baseSchema.extend({
  combinedFileUrl: z.string().min(1, "Combined proposal file is required"),
  videoUrl: z.string().url("Please enter a valid video URL").optional(),
});

export function getSchema(submissionType?: SubmissionType, videoRequired?: boolean, uploadMode?: UploadMode): z.ZodType<SubmitOfferForm, SubmitOfferForm> {
  switch (submissionType) {
    case 'quote_only':
      return quoteOnlySchema;
    case 'video_only':
      return videoOnlySchema;
    case 'tech_fin_with_video': {
      const base = uploadMode === 'combined' ? techFinWithVideoCombinedSchema : techFinWithVideoSeparateSchema;
      if (videoRequired) {
        return base.extend({
          videoUrl: z.string().url("Please enter a valid video URL").min(1, "Video is required for this tender"),
        });
      }
      return base;
    }
    case 'tech_fin_proposal':
    default:
      return uploadMode === 'combined' ? techFinCombinedSchema : techFinSeparateSchema;
  }
}

export type SubmitOfferForm = {
  technicalFileUrl?: string;
  financialFileUrl?: string;
  combinedFileUrl?: string;
  quotePrice?: number;
  videoUrl?: string;
  notes?: string;
};
