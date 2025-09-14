import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import { IPageICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCategory";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Search and list community platform categories with filtering and pagination.
 *
 * Retrieves a filtered, sorted, and paginated list of categories from the
 * community_platform_categories table. Allows advanced search by name and
 * description, controls sorting and pagination, and returns summary data per
 * IPageICommunityPlatformCategory.ISummary. Only allows fields specified in the
 * schema and transforms dates to string & tags.Format<'date-time'>. No use of
 * Date objects or type assertions. Suitable for authenticated member users.
 *
 * @param props - Object containing:
 *
 *   - MemberUser: MemberuserPayload (authenticated member user - for context)
 *   - Body: ICommunityPlatformCategory.IRequest (filter, paging, sorting criteria)
 *
 * @returns A summary page of categories with pagination, suitable for
 *   admin/member selector UIs.
 */
export async function patch__communityPlatform_memberUser_categories(props: {
  memberUser: MemberuserPayload;
  body: ICommunityPlatformCategory.IRequest;
}): Promise<IPageICommunityPlatformCategory.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const safeLimit = limit < 1 ? 1 : limit > 100 ? 100 : limit;
  const skip = (page - 1) * safeLimit;
  const sortBy =
    body.sortBy === "display_order" ||
    body.sortBy === "name" ||
    body.sortBy === "created_at" ||
    body.sortBy === "updated_at"
      ? body.sortBy
      : "display_order";
  const sortDir = body.sortDir === "desc" ? "desc" : "asc";

  const where = {
    ...(body.name !== undefined &&
      body.name.length > 0 && {
        name: { contains: body.name },
      }),
    ...(body.description !== undefined &&
      body.description.length > 0 && {
        description: { contains: body.description },
      }),
  };

  const [categories, total] = await Promise.all([
    MyGlobal.prisma.community_platform_categories.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip,
      take: safeLimit,
    }),
    MyGlobal.prisma.community_platform_categories.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(safeLimit),
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
    data: categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      display_order: cat.display_order,
      description: cat.description ?? null,
      created_at: toISOStringSafe(cat.created_at),
      updated_at: toISOStringSafe(cat.updated_at),
    })),
  };
}
