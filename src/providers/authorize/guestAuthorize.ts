import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

/**
 * Authorization provider for Guest (anonymous visitor) role. Validates JWT payload and verifies guest existence and soft deletion status.
 * @param request HTTP request object with authorization header
 * @returns GuestPayload data structure with top-level guest id
 * @throws ForbiddenException if the user is not of type 'guest' or not enrolled
 */
export async function guestAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;
  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains the top-level guest table ID
  const guest = await MyGlobal.prisma.community_platform_guests.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });
  if (guest === null) {
    throw new ForbiddenException("You're not enrolled");
  }
  return payload;
}
