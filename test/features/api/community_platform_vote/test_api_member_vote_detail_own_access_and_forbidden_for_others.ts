import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Validates that a member can access details of their own votes, but cannot
 * access votes belonging to others.
 *
 * Business context:
 *
 * - Community platform members should only be able to query voting details
 *   for their own actions (votes), not for votes cast by others.
 * - Detailed vote retrieval API must enforce strict ownership checks.
 *
 * Workflow:
 *
 * 1. Register Member A (joins the platform, authenticates)
 * 2. Simulate a vote entity for Member A (mocked, since vote-creation endpoint
 *    is unavailable)
 * 3. Fetch details for Member A's vote (should succeed)
 * 4. Register Member B (another member, new authentication)
 * 5. Simulate a vote entity for Member B
 * 6. As Member A (current authentication), attempt to fetch Member B's vote
 *    (should fail, forbidden)
 * 7. Try accessing a random (invalid/unassigned) voteId (should fail)
 * 8. Try accessing a vote as a guest/unauthenticated user (should fail)
 *
 * This test targets fine-grained access control for vote detail endpoints,
 * covers both permitted actions and forbidden/negative paths, and documents
 * limitations arising from the inability to create real votes via the API.
 */
export async function test_api_member_vote_detail_own_access_and_forbidden_for_others(
  connection: api.IConnection,
) {
  // 1. Register Member A
  const emailA = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: emailA,
      password: "secure1234!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberA);
  const memberAId = memberA.member.id;

  // 2. Simulate a vote entity for Member A
  const voteA = typia.random<ICommunityPlatformVote>();
  voteA.voter_id = memberAId;

  // 3. Fetch Member A's own vote details (should succeed)
  const fetchedA = await api.functional.communityPlatform.member.votes.at(
    connection,
    {
      voteId: voteA.id,
    },
  );
  typia.assert(fetchedA);
  TestValidator.equals(
    "own vote fetched: voter_id matches memberA",
    fetchedA.voter_id,
    memberAId,
  );
  TestValidator.equals(
    "own vote fetched: vote id matches",
    fetchedA.id,
    voteA.id,
  );

  // 4. Register Member B
  const emailB = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      email: emailB,
      password: "secure5678!",
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberB);

  // 5. Simulate a vote entity for Member B
  const voteB = typia.random<ICommunityPlatformVote>();
  voteB.voter_id = memberB.member.id;

  // 6. As Member A, try to fetch Member B's vote (should fail/forbidden)
  await TestValidator.error(
    "memberA forbidden from accessing memberB's vote details",
    async () => {
      await api.functional.communityPlatform.member.votes.at(connection, {
        voteId: voteB.id,
      });
    },
  );

  // 7. Try fetching an invalid/random voteId (should fail)
  await TestValidator.error(
    "accessing vote with invalid voteId fails",
    async () => {
      await api.functional.communityPlatform.member.votes.at(connection, {
        voteId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 8. Try to fetch vote details as unauthenticated user (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user forbidden from accessing vote details",
    async () => {
      await api.functional.communityPlatform.member.votes.at(unauthConn, {
        voteId: voteA.id,
      });
    },
  );
}
