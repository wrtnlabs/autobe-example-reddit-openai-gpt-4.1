import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Create a new post in community_platform_posts by providing the post details
 * and community association.
 *
 * This operation inserts a new record into the community_platform_posts table
 * on behalf of an authenticated member user. It verifies that the referenced
 * community exists, applies business rules for author/display name handling,
 * and timestamps the creation. If the author_display_name is omitted or blank,
 * it is stored as undefined (the frontend renders this as 'Anonymous'). All
 * fields, including audit timestamps and optional soft-delete status, are
 * returned as required by the API contract and correctly handle ISO 8601
 * formatting. No native Date objects or type assertions are used at any step.
 * Only member user authorship is supported by this function (admin fields
 * remain unset).
 *
 * @param props - The properties for the operation.
 * @param props.memberUser - The authenticated member user's payload.
 * @param props.body - The post creation data, including ID of the target
 *   community, title, body, and (optionally) author display name.
 * @returns The newly created post record, with all persisted fields present.
 * @throws {Error} If the referenced community does not exist.
 */
export async function post__communityPlatform_memberUser_posts(props: {
  memberUser: MemberuserPayload;
  body: ICommunityPlatformPost.ICreate;
}): Promise<ICommunityPlatformPost> {
  const { memberUser, body } = props;

  // 1. Ensure the referenced community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: body.community_platform_community_id },
    });
  if (!community) {
    throw new Error("Community does not exist");
  }

  // 2. Prepare post data
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const postId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  // Fix 1: Type-guard for author_adminuser_id: convert null/undefined to undefined
  // Fix 2: Type-guard for author_display_name (avoid null: undefined if empty or missing, else value)

  const authorDisplayName =
    body.author_display_name !== undefined &&
    body.author_display_name !== null &&
    body.author_display_name !== ""
      ? body.author_display_name
      : undefined;

  const created = await MyGlobal.prisma.community_platform_posts.create({
    data: {
      id: postId,
      community_platform_community_id: body.community_platform_community_id,
      author_memberuser_id: memberUser.id,
      // Don't include adminUser id
      title: body.title,
      body: body.body,
      author_display_name: authorDisplayName,
      created_at: now,
      updated_at: now,
      // intentionally omit deleted_at (for active posts)
    },
  });

  return {
    id: created.id,
    community_platform_community_id: created.community_platform_community_id,
    author_memberuser_id:
      created.author_memberuser_id === null
        ? undefined
        : created.author_memberuser_id,
    author_adminuser_id:
      created.author_adminuser_id === null ||
      created.author_adminuser_id === undefined
        ? undefined
        : created.author_adminuser_id,
    title: created.title,
    body: created.body,
    author_display_name:
      created.author_display_name === null
        ? undefined
        : created.author_display_name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at != null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
