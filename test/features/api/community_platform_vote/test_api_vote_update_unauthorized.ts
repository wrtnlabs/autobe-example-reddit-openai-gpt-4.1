import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Validate that a member cannot update a vote record they do not own
 * (unauthorized update attempt).
 *
 * Business context: Ownership enforcement in voting. The platform must
 * restrict updating vote records to the member who cast the original vote.
 * This test ensures that cross-account editing is strictly forbidden.
 *
 * Steps:
 *
 * 1. Register and authenticate Member A (ownership context).
 * 2. Member A creates a vote (voteId is generated).
 * 3. Register and authenticate Member B (attempted unauthorized editor).
 * 4. Member B attempts to update the vote created by Member A—using the same
 *    voteId.
 * 5. Confirm that the update is rejected with an authorization/forbidden error
 *    using TestValidator.error().
 */
export async function test_api_vote_update_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register Member A
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = "Password123!";
  const memberAJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
      display_name: RandomGenerator.name(1),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAJoin);
  const memberAId = memberAJoin.member.id;

  // 2. Member A creates a vote for a post (simulate with random post_id)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const origVoteValue: 1 | -1 | 0 = 1;
  const vote = await api.functional.communityPlatform.member.votes.create(
    connection,
    {
      body: {
        post_id: postId,
        comment_id: null,
        value: origVoteValue,
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(vote);
  const voteId = vote.id;
  TestValidator.equals("vote is owned by member A", vote.voter_id, memberAId);

  // 3. Register and authenticate Member B (switch context)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = "Password321!";
  const memberBJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
      display_name: RandomGenerator.name(1),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberBJoin);
  const memberBId = memberBJoin.member.id;

  // 4. Member B attempts to update voteId originally created by A
  // Since connection.headers is now Member B, business logic can enforce forbidden update
  await TestValidator.error(
    "member B cannot update member A's vote (should fail)",
    async () => {
      await api.functional.communityPlatform.member.votes.update(connection, {
        voteId: voteId,
        body: { value: -1 } satisfies ICommunityPlatformVote.IUpdate,
      });
    },
  );
}
