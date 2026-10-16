import { IRefreshToken } from "../../models/RefreshToken.model";

export interface IRefreshTokenRepository {
  create(userId: string, token: string, expiresAt: Date): Promise<IRefreshToken>;
  findByToken(token: string): Promise<IRefreshToken | null>;
  deleteByToken(token: string): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
}
