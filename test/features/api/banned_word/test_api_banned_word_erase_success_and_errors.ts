import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedWord";

/**
 * E2E test: soft delete (erase) a banned word by admin including error
 * conditions.
 *
 * This function tests the following workflow:
 *
 * 1. Register a new admin for authentication context using the join API.
 * 2. Create a banned word as this admin.
 * 3. Delete (soft-delete) the banned word using the erase endpoint.
 * 4. Attempt deletion again for the same bannedWordId (should return an error
 *    - not found or already deleted).
 * 5. Attempt deletion for a random non-existent bannedWordId (should also
 *    return error).
 *
 * Edge cases:
 *
 * - Admin must be authenticated before accessing bannedWords erase/create.
 * - Repeat deletion returns error (enforces idempotence or not found
 *   semantics).
 * - Non-existent ID returns error.
 *
 * For this code, focus only on provided functional endpoints.
 */
export async function test_api_banned_word_erase_success_and_errors(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const joinResp = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(2),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(joinResp);
  // Admin token is now set on connection

  // 2. Create a banned word
  const phrase = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const createResp =
    await api.functional.communityPlatform.admin.bannedWords.create(
      connection,
      {
        body: {
          phrase,
          category: RandomGenerator.pick([null, "profanity", "hate", "spam"]),
          enabled: true,
        } satisfies ICommunityPlatformBannedWord.ICreate,
      },
    );
  typia.assert(createResp);

  // 3. Delete (soft-delete) the banned word
  await api.functional.communityPlatform.admin.bannedWords.erase(connection, {
    bannedWordId: createResp.id,
  });

  // 4. Attempt deletion again for the same bannedWordId (should error)
  await TestValidator.error(
    "repeat deletion should fail with error",
    async () => {
      await api.functional.communityPlatform.admin.bannedWords.erase(
        connection,
        {
          bannedWordId: createResp.id,
        },
      );
    },
  );

  // 5. Attempt deletion with random non-existent bannedWordId (should error)
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete on non-existent bannedWordId should fail",
    async () => {
      await api.functional.communityPlatform.admin.bannedWords.erase(
        connection,
        {
          bannedWordId: randomId, // This ID is very likely non-existent
        },
      );
    },
  );
}
