import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update a user's existing vote on a post or comment in the community platform.
 *
 * This endpoint allows a logged-in member to update their own previously-cast
 * vote (upvote, downvote, or neutrality) on a post or comment by vote ID. The
 * system verifies that the authenticated member is the owner of the vote and
 * that the vote is not deleted. The vote value is updated and all changes are
 * tracked with an updated_at timestamp for audit compliance.
 *
 * @param props - Request properties
 * @param props.member - The current authenticated member performing the update
 * @param props.voteId - The vote record ID to be updated
 * @param props.body - The update payload (must be { value: 1, 0, or -1 })
 * @returns The updated vote record, with all standard fields mapped and
 *   brand-corrected
 * @throws {Error} If the vote does not exist, is deleted, or is not owned by
 *   the requesting member
 */
export async function put__communityPlatform_member_votes_$voteId(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformVote.IUpdate;
}): Promise<ICommunityPlatformVote> {
  const { member, voteId, body } = props;

  // 1. Fetch the vote record and validate existence, owner, and active state
  const vote = await MyGlobal.prisma.community_platform_votes.findUniqueOrThrow(
    {
      where: { id: voteId },
    },
  );
  if (vote.deleted_at !== null)
    throw new Error("Vote not found or already deleted");
  if (vote.voter_id !== member.id)
    throw new Error("Unauthorized: Not your vote");

  // 2. Update value (0 | 1 | -1) and updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_votes.update({
    where: { id: voteId },
    data: {
      value: body.value as 1 | 0 | -1,
      updated_at: now,
    },
  });

  // 3. Map Prisma result to the ICommunityPlatformVote DTO response (type safety & brands)
  return {
    id: updated.id,
    voter_id: updated.voter_id,
    post_id: updated.post_id ?? null,
    comment_id: updated.comment_id ?? null,
    value: updated.value as 1 | 0 | -1,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
