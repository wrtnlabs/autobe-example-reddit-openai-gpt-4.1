import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Test updating an upvote to a downvote (value change from 1 to -1) for a
 * vote record.
 *
 * This test validates the vote update endpoint for the member role.
 * Workflow:
 *
 * 1. Register a new member to obtain authentication.
 * 2. Create an initial upvote (value: 1) for a target (select post vote for
 *    this test).
 * 3. Update that vote's value to -1 (downvote) using PUT
 *    /communityPlatform/member/votes/{voteId}.
 * 4. Verify that the response's value property is -1, the voteId is unchanged,
 *    and linking fields (post_id or comment_id) are preserved.
 * 5. Audit fields (created_at, updated_at) are present and updated_at is later
 *    than or equal to updated_at from original vote.
 *
 * Note: Test does not validate overall item "score" field as post/comment
 * read APIs are not provided.
 */
export async function test_api_vote_update_to_downvote(
  connection: api.IConnection,
) {
  // 1. Register a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const displayName = RandomGenerator.name();
  const joinResult = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "abcTest123",
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResult);
  const memberId = joinResult.member.id;

  // 2. Create initial upvote (target post vote for this test)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const upvote = await api.functional.communityPlatform.member.votes.create(
    connection,
    {
      body: {
        post_id: postId,
        comment_id: null,
        value: 1,
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(upvote);
  TestValidator.equals("initial vote is upvote (1)", upvote.value, 1);
  TestValidator.equals(
    "vote belongs to correct member",
    upvote.voter_id,
    memberId,
  );
  TestValidator.equals("vote attached to correct post", upvote.post_id, postId);
  TestValidator.equals("vote is not for comment", upvote.comment_id, null);

  // 3. Update the vote to downvote (value: -1)
  const updated = await api.functional.communityPlatform.member.votes.update(
    connection,
    {
      voteId: upvote.id,
      body: {
        value: -1,
      } satisfies ICommunityPlatformVote.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "updated voteId matches original",
    updated.id,
    upvote.id,
  );
  TestValidator.equals(
    "updated vote value is -1 after downvote",
    updated.value,
    -1,
  );
  TestValidator.equals(
    "updated vote references same post",
    updated.post_id,
    postId,
  );
  TestValidator.equals(
    "updated vote member matches",
    updated.voter_id,
    memberId,
  );
  TestValidator.equals(
    "updated vote is not for comment",
    updated.comment_id,
    null,
  );
  // Audit field checks
  TestValidator.predicate(
    "created_at field exists",
    typeof updated.created_at === "string" && !!updated.created_at,
  );
  TestValidator.predicate(
    "updated_at field exists",
    typeof updated.updated_at === "string" && !!updated.updated_at,
  );
  // updated_at should be greater than or equal to old updated_at
  TestValidator.predicate(
    "updated_at is not earlier than original",
    new Date(updated.updated_at).getTime() >=
      new Date(upvote.updated_at).getTime(),
  );
}
