export interface UserDto {
  id: number;
  email: string;
  fullName: string;
  dateOfBirth: string | null;
  gender: number | null;
  phoneNumber: string | null;
  roles: string[];
  profiles: ProfileDto[];
  hasPassword: boolean;
  hasGoogleLinked: boolean;
}

export interface ProfileDto {
  id: number;
  profileName: string;
  address: string | null;
  avatarUrl: string | null;
}

export interface UpdateMyInfoRequest {
  fullName: string;
  dateOfBirth: string | null;
  gender: number | null;
  phoneNumber: string | null;
}

export interface CreateProfileRequest {
  profileName: string;
  address?: string;
  avatarUrl?: string;
}

export interface UpdateProfileRequest {
  profileId: number;
  profileName: string;
  address?: string;
  avatarUrl?: string;
}
