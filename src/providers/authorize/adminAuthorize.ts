import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

/**
 * Authenticates and authorizes an admin user.
 * Uses JWT payload to verify admin role and active status.
 * @param request HTTP request object containing the authorization header
 * @returns AdminPayload
 * @throws ForbiddenException if not an admin or account is deleted/inactive
 */
export async function adminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AdminPayload> {
  const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Admin table is standalone. Use primary key field for ID.
  const admin = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      is_active: true,
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
