import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformDataExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDataExportLog";
import { IPageICommunityPlatformDataExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDataExportLog";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Search, filter, and paginate data export logs
 * (community_platform_data_export_logs) for compliance and audit purposes.
 *
 * This endpoint enables adminUsers to perform advanced search, filtering, and
 * pagination over all data export logs in the platform. The search supports
 * filtering by member/admin user ID, export type, status, format, and creation
 * date range. Results exclude soft-deleted records and are paginated and sorted
 * according to supplied request body parameters.
 *
 * Security: Only authenticated adminUser roles may invoke this operation.
 * Unauthorized access will throw an error.
 *
 * @param props - Operation props
 * @param props.adminUser - Authenticated adminUser payload (authorization
 *   required)
 * @param props.body - Search and pagination parameters for data export logs
 * @returns Paginated and filtered data export log records
 * @throws {Error} When adminUser authentication is missing
 */
export async function patch__communityPlatform_adminUser_dataExportLogs(props: {
  adminUser: AdminuserPayload;
  body: ICommunityPlatformDataExportLog.IRequest;
}): Promise<IPageICommunityPlatformDataExportLog> {
  const { adminUser, body } = props;
  if (!adminUser) {
    throw new Error("Unauthorized: adminUser authentication required");
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Only allow sorting on allowed fields for security.
  const allowedSortFields = [
    "created_at",
    "status",
    "export_type",
    "export_format",
  ];
  const sortField = allowedSortFields.includes(body.sort ?? "")
    ? (body.sort as string)
    : "created_at";
  // Always sort descending by default for created_at.
  const sortOrder = "desc";

  // Build Prisma where clause with safe null/undefined filtering.
  const where = {
    deleted_at: null,
    ...(body.member_user_id !== undefined &&
      body.member_user_id !== null && { member_user_id: body.member_user_id }),
    ...(body.admin_user_id !== undefined &&
      body.admin_user_id !== null && { admin_user_id: body.admin_user_id }),
    ...(body.export_type !== undefined &&
      body.export_type !== null && { export_type: body.export_type }),
    ...(body.export_format !== undefined &&
      body.export_format !== null && { export_format: body.export_format }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...((body.date_from !== undefined && body.date_from !== null) ||
    (body.date_to !== undefined && body.date_to !== null)
      ? {
          created_at: {
            ...(body.date_from !== undefined &&
              body.date_from !== null && { gte: body.date_from }),
            ...(body.date_to !== undefined &&
              body.date_to !== null && { lte: body.date_to }),
          },
        }
      : {}),
  };

  const [data, count] = await Promise.all([
    MyGlobal.prisma.community_platform_data_export_logs.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_data_export_logs.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: count,
      pages: Math.ceil(count / limit),
    },
    data: data.map((item) => ({
      id: item.id,
      member_user_id: item.member_user_id ?? undefined,
      admin_user_id: item.admin_user_id ?? undefined,
      export_type: item.export_type,
      export_format: item.export_format,
      requested_ip: item.requested_ip,
      status: item.status,
      created_at: toISOStringSafe(item.created_at),
      deleted_at: item.deleted_at
        ? toISOStringSafe(item.deleted_at)
        : undefined,
    })),
  };
}
