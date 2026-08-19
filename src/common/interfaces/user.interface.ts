export interface UserJwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
  kycLevel: number;
  isBanned: boolean;
  isVerified: boolean;
  sellerApplicationStatus: string;
}
