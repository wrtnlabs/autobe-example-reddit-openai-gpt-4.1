import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Test successful voting on an existing comment as an authenticated member.
 *
 * This E2E validates that a newly registered member can successfully cast a
 * vote (downvote: -1) on a valid comment. The test does not cover comment
 * setup or retrieval but simulates a realistic, authenticated member voting
 * scenario with random ids.
 *
 * Steps:
 *
 * 1. Register a new member with random email and password.
 * 2. Generate a random comment_id (simulating a valid, existing comment
 *    created by prior setup/external process).
 * 3. As the authenticated member, call the vote API with comment_id and value
 *    -1 (downvote).
 * 4. Validate successful creation, correct voter_id, value, and comment_id in
 *    the response.
 *
 * Note: Score reflection in the comment cannot be tested as no comment
 * query endpoint is available.
 */
export async function test_api_vote_create_comment_success(
  connection: api.IConnection,
) {
  // 1. Register a new member and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);
  const member = memberJoin.member;

  // 2. Simulate a valid, existing comment_id for voting (typically created externally)
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Submit a downvote (-1) as the authenticated member
  const vote = await api.functional.communityPlatform.member.votes.create(
    connection,
    {
      body: {
        post_id: null, // voting on a comment only
        comment_id: commentId,
        value: -1,
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(vote);

  // 4. Validate API response
  TestValidator.equals("voter_id matches member id", vote.voter_id, member.id);
  TestValidator.equals(
    "comment_id matches vote target",
    vote.comment_id,
    commentId,
  );
  TestValidator.equals("vote value is -1 (downvote)", vote.value, -1);
}
