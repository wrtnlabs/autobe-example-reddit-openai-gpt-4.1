import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Test successful voting on a post as an authenticated member.
 *
 * This test covers the member registration and voting workflow for upvoting
 * a post.
 *
 * 1. Register a new member with unique credentials (email, password, display
 *    name).
 * 2. Assume a valid post UUID exists for voting (for this test, we generate a
 *    random UUID as post creation is out of scope).
 * 3. As the authenticated member, upvote (value: 1) the post using POST
 *    /communityPlatform/member/votes.
 * 4. Verify the returned vote references the correct member, post, and upvote
 *    value.
 * 5. Ensure the vote record is unique for (member, post): a repeated upvote
 *    does not create a new record but updates existing vote.
 *
 * Note: Post creation is considered an external dependency; the test only
 * simulates a valid post UUID for the voting test.
 */
export async function test_api_vote_create_post_success(
  connection: api.IConnection,
) {
  // 1. Register a new member for voting
  const memberInput: ICommunityPlatformMember.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
  };
  const authorized: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberInput,
    });
  typia.assert(authorized);
  const member = authorized.member;

  // 2. Assume a valid post UUID exists (mock a random UUID here since post creation is out of scope)
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. First upvote as this member on the post
  const voteBody: ICommunityPlatformVote.ICreate = {
    post_id: postId,
    value: 1,
  };
  const vote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: voteBody,
    });
  typia.assert(vote);

  // 4. Verify the returned vote object
  TestValidator.equals("vote value is upvote", vote.value, 1);
  TestValidator.equals("vote post_id matches", vote.post_id, postId);
  TestValidator.equals(
    "vote voter_id matches member.id",
    vote.voter_id,
    member.id,
  );
  TestValidator.predicate(
    "vote id is non-empty string",
    typeof vote.id === "string" && vote.id.length > 0,
  );
  TestValidator.predicate(
    "vote has timestamps",
    !!vote.created_at && !!vote.updated_at,
  );

  // 5. Repeat upvote: should update the same vote, not create a new one
  const voteBody2: ICommunityPlatformVote.ICreate = {
    post_id: postId,
    value: 1,
  };
  const vote2: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: voteBody2,
    });
  typia.assert(vote2);
  TestValidator.equals(
    "repeat upvote does not create new record",
    vote2.id,
    vote.id,
  );
  TestValidator.equals(
    "repeat upvote voter_id matches",
    vote2.voter_id,
    vote.voter_id,
  );
  TestValidator.equals(
    "repeat upvote post_id matches",
    vote2.post_id,
    vote.post_id,
  );
  TestValidator.equals("repeat upvote value is 1", vote2.value, 1);
}
