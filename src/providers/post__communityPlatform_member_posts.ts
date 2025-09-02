import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Create a new post in a community by an authenticated member.
 *
 * This endpoint allows any authenticated member to create a post in a specific
 * community. Fields required: community ID (from body), author/member ID (from
 * authentication), title (5-120 chars), body (10-10,000 chars), optional
 * author_display_name. Timestamps (created_at, updated_at) are managed
 * automatically. Returns the complete created post entity per schema. If
 * community/member does not exist, throws error.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member (MemberPayload) creating the
 *   post
 * @param props.body - The post creation request body
 *   (ICommunityPlatformPost.ICreate)
 * @returns The newly created ICommunityPlatformPost entity
 * @throws {Error} If FK violations (invalid community or member) or DB errors
 *   occur
 */
export async function post__communityPlatform_member_posts(props: {
  member: MemberPayload;
  body: ICommunityPlatformPost.ICreate;
}): Promise<ICommunityPlatformPost> {
  const { member, body } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_platform_posts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_platform_community_id: body.community_platform_community_id,
      community_platform_member_id: member.id,
      title: body.title,
      body: body.body,
      author_display_name: body.author_display_name ?? null,
      created_at: now,
      updated_at: now,
    },
  });
  return {
    id: created.id,
    community_platform_community_id: created.community_platform_community_id,
    community_platform_member_id: created.community_platform_member_id,
    title: created.title,
    body: created.body,
    author_display_name: created.author_display_name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
