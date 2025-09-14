import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformExternalIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformExternalIntegration";
import { IPageICommunityPlatformExternalIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformExternalIntegration";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Search and paginate external integrations
 * (community_platform_external_integrations)
 *
 * Fetches a paginated, filterable list of all external integrations registered
 * on the platform, including fields for integration name, provider URL, status,
 * and configuration metadata. Admin-only; used for dashboard and compliance
 * management.
 *
 * Supports advanced search by integration name, provider URL, status, and
 * creation/update timestamps. Pagination and deterministic ordering are
 * enforced. Only ISummary (safe, non-confidential fields) are returned.
 *
 * @param props - Arguments object
 * @param props.adminUser - The authenticated admin user performing the request
 * @param props.body - Filtering, pagination, and search options
 * @returns Paginated summary list of matching external integrations
 * @throws {Error} When not authorized as adminUser
 * @throws {Error} When search filters are too short for partial matches
 */
export async function patch__communityPlatform_adminUser_externalIntegrations(props: {
  adminUser: AdminuserPayload;
  body: ICommunityPlatformExternalIntegration.IRequest;
}): Promise<IPageICommunityPlatformExternalIntegration.ISummary> {
  const { adminUser, body } = props;

  if (!adminUser || adminUser.type !== "adminUser") {
    throw new Error("Unauthorized: valid adminUser required");
  }

  // Validate search string length for integration_name and provider_url
  if (
    body.integration_name !== undefined &&
    body.integration_name !== null &&
    body.integration_name.length > 0 &&
    body.integration_name.length < 2
  ) {
    throw new Error("integration_name search must be at least 2 characters");
  }
  if (
    body.provider_url !== undefined &&
    body.provider_url !== null &&
    body.provider_url.length > 0 &&
    body.provider_url.length < 2
  ) {
    throw new Error("provider_url search must be at least 2 characters");
  }

  const page =
    typeof body.page === "number" && body.page > 0 ? Number(body.page) : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? Number(body.limit) : 20;

  // Build dynamic where clause
  const where = {
    ...(body.integration_name !== undefined &&
    body.integration_name !== null &&
    body.integration_name.length >= 2
      ? {
          integration_name: { contains: body.integration_name },
        }
      : {}),
    ...(body.provider_url !== undefined &&
    body.provider_url !== null &&
    body.provider_url.length >= 2
      ? {
          provider_url: { contains: body.provider_url },
        }
      : {}),
    ...(body.status !== undefined &&
    body.status !== null &&
    body.status.length > 0
      ? {
          status: body.status,
        }
      : {}),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
            body.created_at_from !== null
              ? { gte: body.created_at_from }
              : {}),
            ...(body.created_at_to !== undefined && body.created_at_to !== null
              ? { lte: body.created_at_to }
              : {}),
          },
        }
      : {}),
    ...(body.updated_at_from !== undefined || body.updated_at_to !== undefined
      ? {
          updated_at: {
            ...(body.updated_at_from !== undefined &&
            body.updated_at_from !== null
              ? { gte: body.updated_at_from }
              : {}),
            ...(body.updated_at_to !== undefined && body.updated_at_to !== null
              ? { lte: body.updated_at_to }
              : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_external_integrations.findMany({
      where,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_external_integrations.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      integration_name: row.integration_name,
      provider_url: row.provider_url === undefined ? null : row.provider_url,
      status: row.status,
      last_successful_sync_at:
        row.last_successful_sync_at !== null &&
        row.last_successful_sync_at !== undefined
          ? toISOStringSafe(row.last_successful_sync_at)
          : null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
