import { IRefreshToken, RefreshTokenModel } from "../../models/RefreshToken.model";
import { IRefreshTokenRepository } from "../interfaces/IRefreshTokenRepository";

export class RefreshTokenRepository implements IRefreshTokenRepository {
  async create(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<IRefreshToken> {
    const doc = new RefreshTokenModel({ userId, token, expiresAt });
    return doc.save();
  }

  async findByToken(token: string): Promise<IRefreshToken | null> {
    return RefreshTokenModel.findOne({ token }).exec();
  }

  async deleteByToken(token: string): Promise<void> {
    await RefreshTokenModel.deleteOne({ token }).exec();
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await RefreshTokenModel.deleteMany({ userId }).exec();
  }
}
