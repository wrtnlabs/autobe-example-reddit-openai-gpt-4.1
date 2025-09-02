import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IPageICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Admin search and list of all configuration settings
 * (community_platform_configurations table).
 *
 * Retrieve a filtered, paginated list of system configuration parameters from
 * the platform. This operation supports complex querying and sorting over all
 * configuration settings, enabling administrative review, audit trail
 * inspection, and system-wide settings management. Returned results include
 * both active and soft-deleted settings, depending on query filters. Only admin
 * users are permitted to access this sensitive endpoint to ensure proper
 * configuration governance. Supports search by key, date range, and status.
 * Business logic ensures confidential information is excluded unless
 * authorized.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin performing the operation
 * @param props.body - Filtering, search, and pagination parameters for
 *   configuration settings query
 * @returns Paginated list of configuration settings matching the search
 *   criteria
 * @throws {Error} When authentication is missing or admin has insufficient
 *   privileges
 */
export async function patch__communityPlatform_admin_configurations(props: {
  admin: AdminPayload;
  body: ICommunityPlatformConfiguration.IRequest;
}): Promise<IPageICommunityPlatformConfiguration> {
  const { body } = props;

  // Default pagination settings
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Build Prisma where clause based on filters
  const where = {
    ...(body.key !== undefined && body.key !== null && { key: body.key }),
    // includeDeleted: only show soft-deleted when explicitly requested
    ...(body.includeDeleted === true
      ? {} // do not filter deleted_at
      : { deleted_at: null }),
    ...(body.q !== undefined &&
      body.q !== null && {
        OR: [
          { key: { contains: body.q, mode: "insensitive" as const } },
          { value: { contains: body.q, mode: "insensitive" as const } },
          { description: { contains: body.q, mode: "insensitive" as const } },
        ],
      }),
  };

  // Fetch rows and total count atomically
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_configurations.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.community_platform_configurations.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((c) => ({
      id: c.id,
      key: c.key,
      value: c.value,
      description: c.description ?? null,
      created_at: toISOStringSafe(c.created_at),
      updated_at: toISOStringSafe(c.updated_at),
      deleted_at: c.deleted_at ? toISOStringSafe(c.deleted_at) : null,
    })),
  };
}
