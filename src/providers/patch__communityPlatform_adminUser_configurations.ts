import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IPageICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformConfiguration";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Retrieves a paginated, filtered list of platform configuration parameters.
 *
 * Fetches system configuration records from the
 * community_platform_configurations table, supporting key/value/description
 * substring filters, date range filtering, admin-access paging/sorting, and
 * conversion of all date fields to ISO8601 format with branding.
 *
 * @param props - Call props
 * @param props.adminUser - The authenticated admin user making the request
 * @param props.body - Search/filter and paging criteria for configs
 * @returns Paginated response of configuration parameter summaries
 * @throws Error if invalid sort_by, sort_direction, or unexpected database
 *   error
 */
export async function patch__communityPlatform_adminUser_configurations(props: {
  adminUser: AdminuserPayload;
  body: ICommunityPlatformConfiguration.IRequest;
}): Promise<IPageICommunityPlatformConfiguration.ISummary> {
  const { body } = props;
  // Defaults
  const page = body.page != null && body.page > 0 ? body.page : 1;
  const limit = body.limit != null && body.limit > 0 ? body.limit : 20;
  const allowedSort: ("created_at" | "updated_at" | "key" | "value")[] = [
    "created_at",
    "updated_at",
    "key",
    "value",
  ];
  const sortField: "created_at" | "updated_at" | "key" | "value" =
    body.sort_by && allowedSort.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder = body.sort_direction === "asc" ? "asc" : "desc";
  // Date range filter: API uses YYYY-MM-DD, convert to RFC3339 date-time range (start/end of day)
  let createdAtFilter: { gte?: string; lte?: string } | undefined = undefined;
  if (body.date_from || body.date_to) {
    createdAtFilter = {};
    if (body.date_from) {
      createdAtFilter.gte = `${body.date_from}T00:00:00.000Z` as string &
        tags.Format<"date-time">;
    }
    if (body.date_to) {
      createdAtFilter.lte = `${body.date_to}T23:59:59.999Z` as string &
        tags.Format<"date-time">;
    }
  }
  // Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_configurations.findMany({
      where: {
        ...(body.key_query != null &&
          body.key_query !== "" && {
            key: { contains: body.key_query },
          }),
        ...(body.value_query != null &&
          body.value_query !== "" && {
            value: { contains: body.value_query },
          }),
        ...(body.description_query != null &&
          body.description_query !== "" && {
            description: { contains: body.description_query },
          }),
        ...(createdAtFilter && (createdAtFilter.gte || createdAtFilter.lte)
          ? { created_at: createdAtFilter as { gte?: string; lte?: string } }
          : {}),
      },
      orderBy: {
        [sortField]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_configurations.count({
      where: {
        ...(body.key_query != null &&
          body.key_query !== "" && {
            key: { contains: body.key_query },
          }),
        ...(body.value_query != null &&
          body.value_query !== "" && {
            value: { contains: body.value_query },
          }),
        ...(body.description_query != null &&
          body.description_query !== "" && {
            description: { contains: body.description_query },
          }),
        ...(createdAtFilter && (createdAtFilter.gte || createdAtFilter.lte)
          ? { created_at: createdAtFilter as { gte?: string; lte?: string } }
          : {}),
      },
    }),
  ]);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((c) => ({
      id: c.id,
      key: c.key,
      value: c.value,
      description: c.description ?? undefined,
      created_at: toISOStringSafe(c.created_at),
      updated_at: toISOStringSafe(c.updated_at),
    })),
  };
}
