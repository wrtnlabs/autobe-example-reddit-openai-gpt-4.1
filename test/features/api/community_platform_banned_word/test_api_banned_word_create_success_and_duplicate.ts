import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedWord";

/**
 * E2E test for community platform admin banned word creation.
 *
 * Validates both successful creation of a new banned word and enforcement
 * of phrase uniqueness (conflict on duplicate).
 *
 * 1. Register an admin (POST /auth/admin/join) and use authenticated context.
 * 2. As admin, create a new banned word (POST
 *    /communityPlatform/admin/bannedWords) with unique
 *    phrase/category/enabled values. Validate the returned banned word
 *    matches the creation request and has required metadata fields (id,
 *    created_at, etc).
 * 3. Attempt to create another banned word with the same phrase. Expect a
 *    conflict error (409), validating the unique constraint is enforced.
 * 4. Ensures full coverage of happy path and business validation logic within
 *    current API constraints.
 */
export async function test_api_banned_word_create_success_and_duplicate(
  connection: api.IConnection,
) {
  // 1. Register admin (with unique email/password)
  const adminReg = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminReg);

  // 2. Create banned word with unique phrase
  const phrase = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });
  const category = RandomGenerator.pick([
    "profanity",
    "spam",
    "hate",
    null,
  ] as const);
  const createInput = {
    phrase,
    category,
    enabled: true,
  } satisfies ICommunityPlatformBannedWord.ICreate;
  const bannedWord =
    await api.functional.communityPlatform.admin.bannedWords.create(
      connection,
      {
        body: createInput,
      },
    );
  typia.assert(bannedWord);

  TestValidator.equals(
    "banned word phrase matches input",
    bannedWord.phrase,
    phrase,
  );
  TestValidator.equals(
    "banned word category matches input",
    bannedWord.category,
    category,
  );
  TestValidator.equals(
    "banned word enabled matches input",
    bannedWord.enabled,
    true,
  );
  TestValidator.predicate(
    "banned word id is present",
    typeof bannedWord.id === "string" && bannedWord.id.length > 0,
  );
  TestValidator.predicate(
    "banned word created_at is ISO 8601",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(bannedWord.created_at),
  );
  TestValidator.predicate(
    "banned word updated_at is ISO 8601",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(bannedWord.updated_at),
  );

  // 3. Attempt duplicate creation (same phrase)
  await TestValidator.error(
    "duplicate banned word phrase returns conflict error 409",
    async () => {
      await api.functional.communityPlatform.admin.bannedWords.create(
        connection,
        {
          body: {
            phrase, // same as before (duplicate)
            category,
            enabled: true,
          } satisfies ICommunityPlatformBannedWord.ICreate,
        },
      );
    },
  );
}
