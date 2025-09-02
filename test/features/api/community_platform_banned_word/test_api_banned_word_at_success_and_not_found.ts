import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedWord";

/**
 * E2E test for retrieving banned word details by ID as an admin (success
 * and not found).
 *
 * This test covers two scenarios:
 *
 * 1. Success: Register a new admin, create a banned word, and fetch its
 *    details by ID. Validate that all key properties (phrase, category,
 *    enabled, created/updated timestamps, ID) are returned as expected and
 *    match the values from creation.
 * 2. Not Found: Attempt to fetch a banned word using a random UUID that does
 *    not exist (or that has been soft-deleted, if possible), and confirm
 *    that an error is thrown (404 not found).
 *
 * Steps:
 *
 * 1. Register new admin using unique email/password.
 * 2. Create a banned word as that admin, store its ID and details.
 * 3. Fetch banned word by ID and verify all returned fields (phrase, category,
 *    enabled, audit timestamps, ID) match what was created.
 * 4. Attempt to fetch banned word using a random (non-existent) UUID and
 *    confirm error is thrown.
 */
export async function test_api_banned_word_at_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "password123!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const admin = adminJoin.admin;
  // 2. Create banned word
  const createInput = {
    phrase: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    category: RandomGenerator.pick([
      "profanity",
      "spam",
      "personal info",
      null,
    ]),
    enabled: true,
  } satisfies ICommunityPlatformBannedWord.ICreate;
  const created =
    await api.functional.communityPlatform.admin.bannedWords.create(
      connection,
      {
        body: createInput,
      },
    );
  typia.assert(created);
  // 3. Fetch banned word by ID and verify fields
  const fetched = await api.functional.communityPlatform.admin.bannedWords.at(
    connection,
    {
      bannedWordId: created.id,
    },
  );
  typia.assert(fetched);
  TestValidator.equals("bannedWord id should match", fetched.id, created.id);
  TestValidator.equals(
    "bannedWord phrase should match",
    fetched.phrase,
    createInput.phrase,
  );
  TestValidator.equals(
    "bannedWord category should match",
    fetched.category,
    createInput.category,
  );
  TestValidator.equals(
    "bannedWord enabled flag should match",
    fetched.enabled,
    createInput.enabled,
  );
  TestValidator.predicate(
    "bannedWord created_at is valid date",
    typeof fetched.created_at === "string" &&
      !Number.isNaN(Date.parse(fetched.created_at)),
  );
  TestValidator.predicate(
    "bannedWord updated_at is valid date",
    typeof fetched.updated_at === "string" &&
      !Number.isNaN(Date.parse(fetched.updated_at)),
  );
  // 4. Not found - random UUID
  await TestValidator.error(
    "should throw not found for nonexistent bannedWordId",
    async () => {
      await api.functional.communityPlatform.admin.bannedWords.at(connection, {
        bannedWordId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
