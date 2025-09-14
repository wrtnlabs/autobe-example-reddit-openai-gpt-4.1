import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestuserPayload } from "../../decorators/payload/GuestuserPayload";

/**
 * Provider for authenticating unauthenticated visitors (guest user).
 *
 * This function verifies the JWT token and ensures the user is registered as a guest user
 * (tracked by the community_platform_guestusers table), not soft-deleted and is active.
 * @param request HTTP request with headers
 * @returns {Promise<GuestuserPayload>} Authenticated guest user payload
 * @throws {ForbiddenException} If not a guest user or if guest user record is deleted
 */
export async function guestuserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<GuestuserPayload> {
  const payload: GuestuserPayload = jwtAuthorize({ request }) as GuestuserPayload;

  if (payload.type !== "guestUser") {
    throw new ForbiddenException(`You're not a guestUser`);
  }

  // payload.id always contains the top-level user table ID
  const guestUser = await MyGlobal.prisma.community_platform_guestusers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (guestUser === null) {
    throw new ForbiddenException("You're not enrolled as a valid guest user");
  }

  return payload;
}
