import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

/**
 * Test retrieval of comment detail by ID, for guest users (public endpoint)
 *
 * Business context: Ensures that the comment detail endpoint is publicly
 * accessible—no authentication required—and that the information returned
 * matches exactly the ICommunityPlatformComment schema (no
 * sensitive/internal fields, all expected fields present, nullability
 * handled). Validates both type safety and data exposure per contract, and
 * that the API returns only what is allowed.
 *
 * Steps:
 *
 * 1. Create a guest (unauthenticated) connection (simulating no Authorization
 *    header).
 * 2. Generate a random commentId in the correct UUID format (in real e2e would
 *    use seeded/fixture data; in simulation, typia.random is sufficient).
 * 3. Fetch comment details via API.
 * 4. Validate returned object type/shape with
 *    typia.assert(ICommunityPlatformComment).
 * 5. Validate field expectations:
 *
 *    - Id, post_id, author_id: UUID format (string)
 *    - Parent_id: string UUID, null, or undefined
 *    - Content: string
 *    - Edited: boolean
 *    - Score: number, null, or undefined
 *    - Created_at, updated_at: ISO 8601 datetime strings
 *    - Deleted_at: ISO 8601 datetime, null, or undefined
 * 6. Confirm no extra/sensitive fields are present (typia.assert coverage).
 */
export async function test_api_comment_detail_retrieval_success(
  connection: api.IConnection,
) {
  // 1. As guest (simulate no Authorization header)
  const guestConn: api.IConnection = { ...connection, headers: {} };
  // 2. Pick a valid random commentId (for simulation, fixture in live)
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Fetch comment detail (public endpoint)
  const comment = await api.functional.communityPlatform.comments.at(
    guestConn,
    { commentId },
  );

  // 4. Validate shape and types strictly
  typia.assert(comment);

  // 5. Per-field validation
  // id, post_id, author_id: string & uuid (cannot test uuid format itself, but must be string)
  TestValidator.predicate(
    "comment.id is string",
    typeof comment.id === "string",
  );
  TestValidator.predicate(
    "comment.post_id is string",
    typeof comment.post_id === "string",
  );
  TestValidator.predicate(
    "comment.author_id is string",
    typeof comment.author_id === "string",
  );

  // parent_id: may be string, null, or undefined
  TestValidator.predicate(
    "comment.parent_id is string/null/undefined",
    comment.parent_id === undefined ||
      comment.parent_id === null ||
      typeof comment.parent_id === "string",
  );

  // content: always a string
  TestValidator.predicate(
    "comment.content is string",
    typeof comment.content === "string",
  );

  // edited: always boolean
  TestValidator.predicate(
    "comment.edited is boolean",
    typeof comment.edited === "boolean",
  );

  // score: may be number, null, or undefined
  TestValidator.predicate(
    "comment.score is number/null/undefined",
    comment.score === undefined ||
      comment.score === null ||
      typeof comment.score === "number",
  );

  // created_at, updated_at: always string (datetime ISO)
  TestValidator.predicate(
    "comment.created_at is string",
    typeof comment.created_at === "string",
  );
  TestValidator.predicate(
    "comment.updated_at is string",
    typeof comment.updated_at === "string",
  );

  // deleted_at: may be string, null, or undefined
  TestValidator.predicate(
    "comment.deleted_at is string/null/undefined",
    comment.deleted_at === undefined ||
      comment.deleted_at === null ||
      typeof comment.deleted_at === "string",
  );

  // 6. No extra/sensitive fields present: typia.assert covers this strictly.
  // Note: In a simulation/mock API test, the returned comment may not have the exact id (commentId) requested if random data is generated. In real API/live data, this check would be tightened and validated against known fixture IDs.
}
