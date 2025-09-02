import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberPayload } from "../../decorators/payload/MemberPayload";

/**
 * Provider function to authorize platform member users via JWT.
 * Validates the token, checks payload type, and verifies the member is active (not deleted/disabled).
 * @param request The HTTP request object containing JWT token in header.
 * @throws ForbiddenException when member is not enrolled, deleted, or inactive.
 * @returns The validated MemberPayload on success.
 */
export async function memberAuthorize(request: {
  headers: { authorization?: string };
}): Promise<MemberPayload> {
  const payload: MemberPayload = jwtAuthorize({ request }) as MemberPayload;

  // Only allow member type
  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not authorized as a member (type: ${payload.type})`);
  }

  // payload.id always refers to top-level member table
  // Member must be active (is_active: true), not deleted (deleted_at: null)
  const member = await MyGlobal.prisma.community_platform_members.findFirst({
    where: {
      id: payload.id,
      is_active: true,
      deleted_at: null,
    },
  });

  if (!member) {
    throw new ForbiddenException("You're not an active member");
  }

  return payload;
}
