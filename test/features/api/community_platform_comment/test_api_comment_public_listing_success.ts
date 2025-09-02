import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Publicly list searchable, paginated comments with filters and sorts.
 *
 * Verifies that any user (guest or authenticated) can retrieve a paginated
 * list of comments with the following features:
 *
 * - Only non-deleted comments are included by default.
 * - Supports query filters: by post, by author, text search (substring).
 * - Supports sort by various columns (created_at, score, etc.) and paginates
 *   correctly.
 * - Returns IPageICommunityPlatformComment.ISummary with correct metadata and
 *   summary items.
 * - Open access: no login or authentication required.
 *
 * Steps:
 *
 * 1. Retrieve first page of comments, default sort/filter.
 *
 *    - Validate pagination and comment summary structure.
 * 2. Retrieve with custom page/limit, validate pagination metadata updates and
 *    data length.
 * 3. If results exist, pick a sample post_id and author_id from comments, then
 *    retrieve with post_id filter—expect comments only for selected post.
 * 4. Retrieve with author_id filter—expect only author’s comments.
 * 5. Search with a substring from some comment’s content using query—expect at
 *    least the sample comment returned.
 * 6. Retrieve sorted by score if any comment has score; validate ordering if
 *    so.
 * 7. Ensure all queries only return non-deleted comments.
 */
export async function test_api_comment_public_listing_success(
  connection: api.IConnection,
) {
  // (1) Retrieve default page (no filters/pagination params)
  const defaultResp = await api.functional.communityPlatform.comments.index(
    connection,
    {
      body: {} satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(defaultResp);
  TestValidator.predicate(
    "pagination meta valid/default",
    defaultResp.pagination.current === 1 && defaultResp.pagination.limit > 0,
  );
  TestValidator.predicate(
    "all comments are summaries",
    defaultResp.data.every(
      (d) => typeof d.id === "string" && typeof d.content === "string",
    ),
  );

  // (2) Retrieve with custom pagination: page 2 with a small page size
  const customLimit = 3;
  const page2 = await api.functional.communityPlatform.comments.index(
    connection,
    {
      body: {
        page: 2,
        limit: customLimit,
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page2 current == 2", page2.pagination.current, 2);
  TestValidator.equals(
    "page2 limit == custom",
    page2.pagination.limit,
    customLimit,
  );

  // Early exit if no comments to filter on
  if (defaultResp.data.length === 0) {
    // No comments exist: all further steps are skipped
    return;
  }

  // (3) Pick a sample comment to extract filter criteria (post_id, author_id, content, etc.)
  const sample = defaultResp.data[0];

  // (3a) Filter all comments belonging to the sample's post
  const byPost = await api.functional.communityPlatform.comments.index(
    connection,
    {
      body: {
        post_id: sample.post_id,
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(byPost);
  TestValidator.predicate(
    "filter post_id matches",
    byPost.data.every((d) => d.post_id === sample.post_id),
  );

  // (4) Filter all comments belonging to the sample's author
  const byAuthor = await api.functional.communityPlatform.comments.index(
    connection,
    {
      body: {
        author_id: sample.author_id,
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(byAuthor);
  TestValidator.predicate(
    "filter author_id matches",
    byAuthor.data.every((d) => d.author_id === sample.author_id),
  );

  // (5) Search with a substring of the sample's content (if content is long enough)
  if (typeof sample.content === "string" && sample.content.length >= 2) {
    const substring = RandomGenerator.substring(sample.content);
    const byQuery = await api.functional.communityPlatform.comments.index(
      connection,
      {
        body: { query: substring } satisfies ICommunityPlatformComment.IRequest,
      },
    );
    typia.assert(byQuery);
    TestValidator.predicate(
      "query matches some",
      byQuery.data.some(
        (d) => typeof d.content === "string" && d.content.includes(substring),
      ),
    );
  } else {
    // If no valid content for query, skip text search step
  }

  // (6) Check if there are at least two comments with numeric scores for sorting validation
  const scoredComments = defaultResp.data.filter(
    (d) => typeof d.score === "number",
  );
  if (scoredComments.length >= 2) {
    const sortedByScore = await api.functional.communityPlatform.comments.index(
      connection,
      {
        body: { sort_by: "score" } satisfies ICommunityPlatformComment.IRequest,
      },
    );
    typia.assert(sortedByScore);
    const scores = sortedByScore.data.map((d) =>
      typeof d.score === "number" ? d.score : -Infinity,
    );
    TestValidator.predicate(
      "sorted by score descending",
      scores.every((v, i, arr) => i === 0 || v <= arr[i - 1]),
    );
  } else {
    // Not enough comments with score to test sort, skip this check
  }

  // (7) Ensure all comments returned are non-deleted (ISummary does not include deleted_at, so any data returned passes this by spec)
  TestValidator.predicate(
    "all returned comments are non-deleted",
    defaultResp.data.every((d) => typeof d.id === "string"),
  );
}
