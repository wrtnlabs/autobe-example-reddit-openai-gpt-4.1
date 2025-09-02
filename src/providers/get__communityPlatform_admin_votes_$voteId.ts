import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get detailed voting record by voteId (admin only).
 *
 * Retrieves a single voting record by its unique voteId from the
 * community_platform_votes table. Returns all vote fields (`id`, `voter_id`,
 * `post_id`, `comment_id`, `value`, timestamps), if found. Only admins may
 * access any voting record. Throws an error if the vote does not exist or has
 * been soft deleted.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the operation
 * @param props.voteId - The unique identifier of the vote record (UUID)
 * @returns The full vote record details
 * @throws {Error} When the vote does not exist or has been soft deleted
 */
export async function get__communityPlatform_admin_votes_$voteId(props: {
  admin: AdminPayload;
  voteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformVote> {
  const { voteId } = props;

  const vote = await MyGlobal.prisma.community_platform_votes.findFirstOrThrow({
    where: {
      id: voteId,
      deleted_at: null,
    },
  });

  return {
    id: vote.id as string & tags.Format<"uuid">,
    voter_id: vote.voter_id as string & tags.Format<"uuid">,
    post_id: vote.post_id as (string & tags.Format<"uuid">) | null,
    comment_id: vote.comment_id as (string & tags.Format<"uuid">) | null,
    value: vote.value as 1 | -1 | 0,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    deleted_at: vote.deleted_at ? toISOStringSafe(vote.deleted_at) : null,
  };
}
