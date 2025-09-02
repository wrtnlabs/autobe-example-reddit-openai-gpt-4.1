import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Soft-deletes (removes) a user's vote on a post or comment.
 *
 * This operation allows an authenticated member to remove (soft-delete) their
 * own vote on a post or comment. The function ensures that only the vote owner
 * is able to delete the vote. A successful operation sets the vote's deleted_at
 * timestamp, preserving the record for audit and rollback. If the vote does not
 * exist, is already deleted, or the member does not own the vote, an error is
 * thrown.
 *
 * @param props - The request context for vote deletion
 * @param props.member - Authenticated member performing this operation
 * @param props.voteId - Unique identifier for the vote to remove (soft delete)
 * @returns Void (on successful deletion)
 * @throws {Error} If vote does not exist or is already deleted
 * @throws {Error} If the authenticated member is not the vote owner
 */
export async function delete__communityPlatform_member_votes_$voteId(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, voteId } = props;

  // Fetch vote: must exist, must not be already soft-deleted
  const vote = await MyGlobal.prisma.community_platform_votes.findFirst({
    where: {
      id: voteId,
      deleted_at: null,
    },
  });

  if (!vote) {
    throw new Error("Vote does not exist or was already deleted");
  }
  if (vote.voter_id !== member.id) {
    throw new Error("Unauthorized: Only the vote owner may delete this vote");
  }

  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  await MyGlobal.prisma.community_platform_votes.update({
    where: { id: voteId },
    data: {
      deleted_at: deletedAt,
    },
  });
}
