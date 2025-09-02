import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Get detailed voting record by voteId.
 *
 * Returns a single voting record including full field data: who voted, the
 * target (post or comment), vote value, and creation/update metadata. Useful
 * for per-user or moderation review. Only the voting member may access their
 * own vote through this endpoint; all others are forbidden. Errors are returned
 * for invalid or unauthorized vote IDs. Used for audit trails and confirming
 * voting actions.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member requesting their own voting
 *   record
 * @param props.voteId - The unique identifier (UUID) of the vote record
 * @returns The full voting record, if found and authorized, as
 *   ICommunityPlatformVote
 * @throws {Error} When the vote does not exist, is deleted, or does not belong
 *   to requesting member.
 */
export async function get__communityPlatform_member_votes_$voteId(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformVote> {
  const { member, voteId } = props;

  // Fetch the vote by id (active only: not soft-deleted)
  const vote = await MyGlobal.prisma.community_platform_votes.findUnique({
    where: { id: voteId },
  });
  if (!vote || vote.deleted_at !== null) throw new Error("Vote not found");
  if (vote.voter_id !== member.id)
    throw new Error("Forbidden: Can only view own vote");

  return {
    id: vote.id as string & tags.Format<"uuid">,
    voter_id: vote.voter_id as string & tags.Format<"uuid">,
    post_id: vote.post_id
      ? (vote.post_id as string & tags.Format<"uuid">)
      : null,
    comment_id: vote.comment_id
      ? (vote.comment_id as string & tags.Format<"uuid">)
      : null,
    value: vote.value as 1 | -1 | 0,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    deleted_at: vote.deleted_at ? toISOStringSafe(vote.deleted_at) : null,
  };
}
