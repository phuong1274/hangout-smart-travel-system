export interface LocationSubmission {
  id: number;
  userId: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address: string;
  telephone?: string;
  email?: string;
  priceMinUsd?: number;
  priceMaxUsd?: number;
  destinationId?: number;
  destinationName?: string;
  locationTypeId?: number;
  locationTypeName?: string;
  mediaLinks?: string[];
  socialLinks?: SubmissionSocialLink[];
  amenityIds?: number[];
  tagIds?: number[];
  status: SubmissionStatus;
  rejectionReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdLocationId?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface SubmissionSocialLink {
  platform: string;
  url: string;
}

export enum SubmissionStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Published = 3
}
