import { IRefreshTokenRepository } from "../../repositories/interfaces/IRefreshTokenRepository";
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  getRefreshTokenExpiry,
} from "../../utils/jwt";
import { AppError } from "../../utils/AppError";

interface RefreshTokensResult {
  accessToken: string;
  refreshToken: string;
}

export class RefreshTokensUseCase {
  constructor(private refreshTokenRepo: IRefreshTokenRepository) {}

  async execute(incomingRefreshToken: string): Promise<RefreshTokensResult> {
    // Verify the token is cryptographically valid
    let payload;
    try {
      payload = verifyRefreshToken(incomingRefreshToken);
    } catch {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    // Check it exists in DB (not yet revoked)
    const tokenDoc = await this.refreshTokenRepo.findByToken(incomingRefreshToken);
    if (!tokenDoc) {
      throw new AppError("Refresh token has been revoked", 401);
    }

    // Rotate: delete old, issue new pair
    await this.refreshTokenRepo.deleteByToken(incomingRefreshToken);

    const newPayload = { userId: payload.userId, role: payload.role };
    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    await this.refreshTokenRepo.create(
      payload.userId,
      newRefreshToken,
      getRefreshTokenExpiry()
    );

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }
}
