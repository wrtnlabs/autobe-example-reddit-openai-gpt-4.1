import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminuserPayload } from "../../decorators/payload/AdminuserPayload";

/**
 * Authorization provider for Adminuser role.
 * Verifies JWT token, ensures role type, and checks DB state of admin user.
 * Throws ForbiddenException if not authorized.
 * @param request HTTP request object containing headers
 * @returns Authenticated AdminuserPayload
 */
export async function adminuserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AdminuserPayload> {
  const payload: AdminuserPayload = jwtAuthorize({ request }) as AdminuserPayload;

  if (payload.type !== "adminUser") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Top-level user ID (community_platform_adminusers.id)
  const admin = await MyGlobal.prisma.community_platform_adminusers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active"
    }
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled or your account is not active.");
  }

  return payload;
}
