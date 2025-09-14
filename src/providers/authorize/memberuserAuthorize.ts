import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberuserPayload } from "../../decorators/payload/MemberuserPayload";

/**
 * Authorization provider for authenticated member users (not admins or guests).
 * Ensures the JWT payload is for a valid member user and the account is active (not deleted).
 *
 * @param request - The HTTP request object with headers.authorization
 * @returns MemberuserPayload (typed JWT payload)
 * @throws ForbiddenException if not a member user or if user is deleted/suspended
 */
export async function memberuserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<MemberuserPayload> {
  const payload: MemberuserPayload = jwtAuthorize({ request }) as MemberuserPayload;

  if (payload.type !== "memberUser") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id = community_platform_memberusers.id (top-level user table ID)
  const member = await MyGlobal.prisma.community_platform_memberusers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      // Optionally, require 'status' to be 'active' or not 'suspended'
      // status: 'active',
    },
  });

  if (member === null) {
    throw new ForbiddenException("You're not enrolled or account is deleted.");
  }

  return payload;
}
