import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * List and search current members of a specific community, with pagination and
 * filtering support.
 *
 * This operation retrieves a paginated and searchable list of all current
 * active members of a particular community from the
 * community_platform_community_memberships table, joined with member details.
 * It supports filtering by join date, searching member display names, and other
 * potential query fields for advanced UI and moderation panels. Only
 * authenticated users can access this operation. Requires the community ID as a
 * path parameter and expects advanced filter/search/sort/pagination in the
 * request body DTO. The response includes summary membership card details
 * suitable for community membership management and display.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member making the request
 * @param props.communityId - UUID of the community to list memberships for
 * @param props.body - Advanced filter/search/sort and pagination options
 * @returns Paginated list of membership summaries
 *   (IPageICommunityPlatformCommunityMembership.ISummary)
 * @throws {Error} If the communityId does not exist or is deleted
 */
export async function patch__communityPlatform_member_communities_$communityId_memberships(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityMembership.IRequest;
}): Promise<IPageICommunityPlatformCommunityMembership.ISummary> {
  const { member, communityId, body } = props;

  // 1. Verify the community exists and is not deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: communityId, deleted_at: null },
      select: { id: true },
    });
  if (!community) throw new Error("Community not found");

  // 2. Prepare pagination input
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // 3. Build where conditions
  const where: Record<string, any> = {
    community_id: communityId,
    // Filter by joined_at if dates specified
    ...((body.joined_after != null || body.joined_before != null) && {
      joined_at: {
        ...(body.joined_after != null && { gte: body.joined_after }),
        ...(body.joined_before != null && { lte: body.joined_before }),
      },
    }),
  };

  // 4. Determine orderBy field
  const allowedSort = ["joined_at", "id", "member_id", "community_id"];
  let orderBy: Record<string, "asc" | "desc"> = { joined_at: "desc" };
  if (body.sort) {
    const [sortField, sortDir] = body.sort.split(" ");
    if (allowedSort.includes(sortField)) {
      orderBy = { [sortField]: sortDir === "asc" ? "asc" : "desc" };
    }
  }

  // 5. Query rows and count; member is joined for filter/search
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_memberships.findMany({
      where,
      orderBy,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: { member: true },
    }),
    MyGlobal.prisma.community_platform_community_memberships.count({ where }),
  ]);

  // 6. (Optional) member_display_name/search handled at application level
  let filteredRows = rows;
  if (body.member_display_name || body.search) {
    const displayNameQuery = (
      body.member_display_name ??
      body.search ??
      ""
    ).toLocaleLowerCase();
    filteredRows = rows.filter((row) => {
      const name = (row.member?.display_name || "").toLocaleLowerCase();
      return name.includes(displayNameQuery);
    });
  }

  // 7. Map result to summary DTO
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: filteredRows.map((row) => ({
      id: row.id as string & tags.Format<"uuid">,
      member_id: row.member_id as string & tags.Format<"uuid">,
      community_id: row.community_id as string & tags.Format<"uuid">,
      joined_at: toISOStringSafe(row.joined_at),
    })),
  };
}
