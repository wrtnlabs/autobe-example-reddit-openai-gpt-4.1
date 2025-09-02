import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Test forbidden voting on own content as an authenticated member.
 *
 * This test ensures a registered member cannot cast votes on their own post
 * or comment. The business rule enforced by the voting endpoint should
 * prevent self-voting, returning an error if attempted.
 *
 * Steps:
 *
 * 1. Register a new member and authenticate – ensures valid session context
 *    for API calls.
 * 2. Attempt to upvote own post (using member's UUID as post_id and a random
 *    upvote value) – expect error.
 * 3. Attempt to upvote own comment (using member's UUID as comment_id and a
 *    random upvote value) – expect error.
 *
 * As there are no post/comment creation APIs in scope, the test simulates
 * the situation by attempting to cast a vote using the member's own ID as
 * the post/comment target. The intention is to invoke the business logic
 * that forbids voting on self-authored content. Expected outcome: Each vote
 * attempt should result in an API error indicating that members cannot vote
 * on their own content.
 */
export async function test_api_vote_create_self_content_forbidden(
  connection: api.IConnection,
) {
  // 1. Register and authenticate new member
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPw1!";
  const displayName = RandomGenerator.name();
  const joinResult = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResult);
  const member = joinResult.member;
  // 2. Member attempts to upvote own post (forbidden case)
  await TestValidator.error(
    "forbid self-vote on own post (member cannot upvote their own post)",
    async () => {
      await api.functional.communityPlatform.member.votes.create(connection, {
        body: {
          post_id: member.id,
          value: 1,
        } satisfies ICommunityPlatformVote.ICreate,
      });
    },
  );
  // 3. Member attempts to upvote own comment (forbidden case)
  await TestValidator.error(
    "forbid self-vote on own comment (member cannot upvote their own comment)",
    async () => {
      await api.functional.communityPlatform.member.votes.create(connection, {
        body: {
          comment_id: member.id,
          value: 1,
        } satisfies ICommunityPlatformVote.ICreate,
      });
    },
  );
}
