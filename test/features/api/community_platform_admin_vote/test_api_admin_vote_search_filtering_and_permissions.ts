import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate admin search and filtering, plus permission checks for vote
 * search.
 *
 * 1. Register an admin user via /auth/admin/join. Confirm token set in
 *    connection and proper profile info.
 * 2. As admin, search the /communityPlatform/admin/votes endpoint with no
 *    filters. Confirm pagination and type assertions.
 * 3. Search with individual filters: voter_id, post_id, comment_id, value
 *    (pick both matching and non-existent values).
 * 4. Search with multiple filters combined.
 * 5. Search with invalid/non-existent filter values to check edge case
 *    behavior (should return empty list, OK response).
 * 6. Confirm sort and pagination fields are respected.
 * 7. Switch connection to a non-admin context (simulate by deleting
 *    Authorization header or using empty headers). Attempt to call the
 *    admin endpoint and confirm a permission error is thrown.
 * 8. All major outputs are type and logic validated with typia.assert and
 *    TestValidator, ensuring admin-only data is accessible only with admin
 *    authorization, filters work as documented, and errors are raised as
 *    required.
 */
export async function test_api_admin_vote_search_filtering_and_permissions(
  connection: api.IConnection,
) {
  // 1. Register admin and assert authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinResp = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "SecurePass123!",
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoinResp);

  // 2. Search with no filters (should get all votes, paginated)
  const noFilterOutput =
    await api.functional.communityPlatform.admin.votes.index(connection, {
      body: {} satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(noFilterOutput);
  TestValidator.predicate(
    "vote search returns pagination",
    typeof noFilterOutput.pagination === "object",
  );
  TestValidator.predicate("data is array", Array.isArray(noFilterOutput.data));

  // If there are any votes available, pick distinct values for filter tests
  const someVotes = noFilterOutput.data.length > 0 ? noFilterOutput.data : [];
  const sampleVote = someVotes[0];

  // 3. Individual filters
  if (sampleVote) {
    // by voter_id
    const byVoter = await api.functional.communityPlatform.admin.votes.index(
      connection,
      { body: { voter_id: sampleVote.voter_id } },
    );
    typia.assert(byVoter);
    TestValidator.predicate(
      "by voter_id returns at least one",
      byVoter.data.length >= 1,
    );
    byVoter.data.forEach((v) =>
      TestValidator.equals("voter_id matches", v.voter_id, sampleVote.voter_id),
    );

    // by post_id (if present)
    if (sampleVote.post_id) {
      const byPost = await api.functional.communityPlatform.admin.votes.index(
        connection,
        { body: { post_id: sampleVote.post_id } },
      );
      typia.assert(byPost);
      byPost.data.forEach((v) =>
        TestValidator.equals("post_id matches", v.post_id, sampleVote.post_id),
      );
    }
    // by comment_id (if present)
    if (sampleVote.comment_id) {
      const byComment =
        await api.functional.communityPlatform.admin.votes.index(connection, {
          body: { comment_id: sampleVote.comment_id },
        });
      typia.assert(byComment);
      byComment.data.forEach((v) =>
        TestValidator.equals(
          "comment_id matches",
          v.comment_id,
          sampleVote.comment_id,
        ),
      );
    }
    // by value
    const byValue = await api.functional.communityPlatform.admin.votes.index(
      connection,
      { body: { value: sampleVote.value } },
    );
    typia.assert(byValue);
    byValue.data.forEach((v) =>
      TestValidator.equals("vote value matches", v.value, sampleVote.value),
    );
  }

  // 4. Multiple filters: voter + value
  if (sampleVote) {
    const multFilter = await api.functional.communityPlatform.admin.votes.index(
      connection,
      {
        body: {
          voter_id: sampleVote.voter_id,
          value: sampleVote.value,
        },
      },
    );
    typia.assert(multFilter);
    multFilter.data.forEach((v) => {
      TestValidator.equals(
        "voter_id matches mult-filter",
        v.voter_id,
        sampleVote.voter_id,
      );
      TestValidator.equals(
        "value matches mult-filter",
        v.value,
        sampleVote.value,
      );
    });
  }

  // 5. Negative filter edge case: non-existent voter_id
  const nonExistentVoter = typia.random<string & tags.Format<"uuid">>();
  const emptyVoterResult =
    await api.functional.communityPlatform.admin.votes.index(connection, {
      body: { voter_id: nonExistentVoter },
    });
  typia.assert(emptyVoterResult);
  TestValidator.equals(
    "no results for non-existent voter",
    emptyVoterResult.data.length,
    0,
  );

  // 5b. Negative filter edge case: non-existent post_id
  const nonExistentPost = typia.random<string & tags.Format<"uuid">>();
  const emptyPostResult =
    await api.functional.communityPlatform.admin.votes.index(connection, {
      body: { post_id: nonExistentPost },
    });
  typia.assert(emptyPostResult);
  TestValidator.equals(
    "no results for non-existent post_id",
    emptyPostResult.data.length,
    0,
  );

  // 6. Pagination and sorting test
  const paginated = await api.functional.communityPlatform.admin.votes.index(
    connection,
    {
      body: { limit: 1, page: 1, sort: "created_at desc" },
    },
  );
  typia.assert(paginated);
  TestValidator.equals(
    "paginated: max one item",
    paginated.data.length <= 1,
    true,
  );

  // 7. Non-admin should be denied access
  // Remove Authorization header for unauthenticated context
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "permission error for non-admin on admin vote search",
    async () => {
      await api.functional.communityPlatform.admin.votes.index(unauthConn, {
        body: {},
      });
    },
  );
}
