import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that community platform members can only retrieve their own
 * voting records and are unable to access votes belonging to other users
 * via the member vote search API.
 *
 * Steps:
 *
 * 1. Register two members (Member A and Member B) to simulate two distinct
 *    users.
 * 2. As Member A, search for votes via /communityPlatform/member/votes.
 *    Confirm only Member A's records are returned and no records of Member
 *    B.
 * 3. Attempt to query explicitly for Member B's voter_id as Member A and
 *    verify access is denied or results are empty.
 * 4. Provide invalid search filters and check for graceful error handling.
 * 5. As guest/unauthenticated user, try to access the search API and confirm
 *    access is denied.
 *
 * Limitation: No endpoints provided to actually cast votes, so focus is on
 * search result scope and error handling only.
 */
export async function test_api_member_vote_search_personal_scope(
  connection: api.IConnection,
) {
  // 1. Register Member A
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAResult = await api.functional.auth.member.join(connection, {
    body: {
      email: memberAEmail,
      password: "StrongP@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAResult);
  const memberAId = memberAResult.member.id;

  // 2. Register Member B in a separate connection context (to preserve A's token)
  const connectionB: api.IConnection = { ...connection, headers: {} };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBResult = await api.functional.auth.member.join(connectionB, {
    body: {
      email: memberBEmail,
      password: "StrongP@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberBResult);
  const memberBId = memberBResult.member.id;

  // 3. As Member A, search for votes: only A's records should appear
  const searchResultA =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {} satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(searchResultA);
  for (const vote of searchResultA.data) {
    TestValidator.equals(
      "vote must belong to member A",
      vote.voter_id,
      memberAId,
    );
  }

  // 4. As Member A, search with voter_id set to member B - should not see any results
  const searchResultAforB =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: { voter_id: memberBId } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(searchResultAforB);
  TestValidator.equals(
    "member A cannot retrieve member B's votes",
    searchResultAforB.data.length,
    0,
  );

  // 5. Invalid search filter: bad UUID for voter_id
  await TestValidator.error(
    "invalid UUID in search filter should fail",
    async () => {
      await api.functional.communityPlatform.member.votes.index(connection, {
        body: {
          voter_id: "not-a-uuid" as any,
        } satisfies ICommunityPlatformVote.IRequest,
      });
    },
  );

  // 6. Invalid search filter: negative page number
  await TestValidator.error("negative page number should fail", async () => {
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: { page: -1 as any } satisfies ICommunityPlatformVote.IRequest,
    });
  });

  // 7. Attempt search as guest (unauthenticated)
  const guestConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "guest cannot access member vote search",
    async () => {
      await api.functional.communityPlatform.member.votes.index(guestConn, {
        body: {} satisfies ICommunityPlatformVote.IRequest,
      });
    },
  );
}
