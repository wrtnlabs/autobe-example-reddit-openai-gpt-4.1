import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Test duplicate voting by the same member on the same post.
 *
 * This test validates that if a single member submits multiple votes for
 * the same post, only one unique vote record exists, and submitting a
 * subsequent vote updates the record, rather than creating a duplicate. The
 * test simulates the typical frontend flow:
 *
 * 1. Register and authenticate a community member
 * 2. Cast an initial upvote (value: 1) on a given post_id
 * 3. Submit a second vote (value: 0 -- neutral/removal) on the same post_id
 * 4. Assert that both returned vote records have the same id (no duplicate
 *    record)
 * 5. Assert that 'value' is updated to reflect the second submission
 * 6. Assert that 'updated_at' is more recent after the second vote (but
 *    'created_at' stays same)
 * 7. Validate other invariant fields: voter_id, post_id
 */
export async function test_api_vote_duplicate_vote_overwrite(
  connection: api.IConnection,
) {
  // 1. Register a member
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPW123abc";
  const displayName = RandomGenerator.name();
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);
  const memberId = memberAuth.member.id;

  // 2. Cast initial vote
  const postId = typia.random<string & tags.Format<"uuid">>();
  const initialVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        post_id: postId,
        comment_id: null,
        value: 1,
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(initialVote);
  TestValidator.equals(
    "voter_id matches memberId",
    initialVote.voter_id,
    memberId,
  );
  TestValidator.equals("post_id matches", initialVote.post_id, postId);
  TestValidator.equals("value is upvote", initialVote.value, 1);

  // 3. Cast duplicate vote with new value
  // (simulate a change in user selection, e.g., unvoting/neutral)
  await new Promise((res) => setTimeout(res, 10)); // Ensures updated_at is different
  const newVote = await api.functional.communityPlatform.member.votes.create(
    connection,
    {
      body: {
        post_id: postId,
        comment_id: null,
        value: 0,
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(newVote);
  TestValidator.equals(
    "vote record id not changed on overwrite",
    newVote.id,
    initialVote.id,
  );
  TestValidator.equals("voter_id still matches", newVote.voter_id, memberId);
  TestValidator.equals("post_id still matches", newVote.post_id, postId);
  TestValidator.equals("vote value updated to neutral", newVote.value, 0);

  // 4. Timestamps
  TestValidator.equals(
    "created_at unchanged",
    newVote.created_at,
    initialVote.created_at,
  );
  TestValidator.predicate(
    "updated_at is newer on overwrite",
    new Date(newVote.updated_at) > new Date(initialVote.updated_at),
  );

  // 5. No new duplicate created
  // No direct way to query vote count for (member, post) with current API, but by confirming single id + invariant fields, duplication is checked.
}
