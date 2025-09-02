import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Test successful soft-deletion of a member's own vote.
 *
 * This test validates the full workflow for a member user casting and then
 * soft-deleting their own vote.
 *
 * Steps:
 *
 * 1. Register and authenticate a new member.
 * 2. Cast an upvote on a random post as the newly created member.
 * 3. Soft-delete the created vote via the DELETE endpoint.
 * 4. Confirm the previous vote is not active by creating a new vote for the
 *    same post and verifying a new record is created.
 *
 * Business rules verified:
 *
 * - Only authenticated members can delete their own votes.
 * - Deleting a vote does not remove it permanently, but marks it as deleted
 *   (soft-delete pattern).
 * - On soft-deletion, a new vote for the same post can be created, and
 *   previous vote is not reused or present as active.
 */
export async function test_api_vote_delete_own_vote_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a member
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformMember.ICreate;
  const auth = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(auth);
  TestValidator.predicate(
    "authentication returns access token",
    typeof auth.token.access === "string" && auth.token.access.length > 0,
  );

  // 2. Cast upvote on a random post
  const voteBody = {
    post_id: typia.random<string & tags.Format<"uuid">>(),
    value: 1 as const,
  } satisfies ICommunityPlatformVote.ICreate;
  const vote = await api.functional.communityPlatform.member.votes.create(
    connection,
    { body: voteBody },
  );
  typia.assert(vote);
  TestValidator.equals(
    "vote voter_id matches member's id",
    vote.voter_id,
    auth.member.id,
  );
  TestValidator.equals("vote value is upvote (1)", vote.value, 1);
  TestValidator.equals("vote not deleted after create", vote.deleted_at, null);

  // 3. Soft-delete the vote
  await api.functional.communityPlatform.member.votes.erase(connection, {
    voteId: vote.id,
  });
  // No return, but should mark vote as deleted in DB

  // 4. Cast another vote for the same post after deletion (should create a new vote record)
  const newVote = await api.functional.communityPlatform.member.votes.create(
    connection,
    {
      body: { ...voteBody, value: -1 as const }, // Downvote this time
    },
  );
  typia.assert(newVote);
  TestValidator.notEquals(
    "new vote id should be different after soft-delete",
    newVote.id,
    vote.id,
  );
  TestValidator.equals(
    "new vote after deletion is active",
    newVote.deleted_at,
    null,
  );
  TestValidator.equals("new vote value is downvote (-1)", newVote.value, -1);
}
