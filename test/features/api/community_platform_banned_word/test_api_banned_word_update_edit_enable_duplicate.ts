import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedWord";

/**
 * E2E: Admin update scenarios for community platform banned word resource.
 *
 * This test validates all update paths for banned word management by admin:
 *
 * 1. Successful edit (phrase/category/enable)
 * 2. Conflict on phrase duplication
 * 3. Enable/disable toggling
 * 4. Update with non-existent/deleted id triggers not found
 *
 * Step-by-step process:
 *
 * - Register and authenticate an admin
 * - Create two banned words for test cases
 * - Edit first word's phrase, category, and enabled independently
 * - After each, verify the change is persisted via update result
 * - Attempt to set word1.phrase = word2.phrase, expect conflict error
 * - Toggle enabled field and check result
 * - Try updating with random non-existent bannedWordId, expect not found
 *   error
 *
 * Business rules: phrase uniqueness, mutability constraints, proper error
 * returns
 */
export async function test_api_banned_word_update_edit_enable_duplicate(
  connection: api.IConnection,
) {
  // 1. Register admin and login context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureTest1234!";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);
  TestValidator.predicate(
    "admin join returns IAuthorized",
    typeof adminJoin.admin.id === "string" && !!adminJoin.token.access,
  );

  // 2. Create two banned words
  const basePhrase1 = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 12,
  });
  const basePhrase2 = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 12,
  });
  const create1 =
    await api.functional.communityPlatform.admin.bannedWords.create(
      connection,
      {
        body: {
          phrase: basePhrase1,
          category: "profanity",
          enabled: true,
        } satisfies ICommunityPlatformBannedWord.ICreate,
      },
    );
  typia.assert(create1);
  const create2 =
    await api.functional.communityPlatform.admin.bannedWords.create(
      connection,
      {
        body: {
          phrase: basePhrase2,
          category: "spam",
          enabled: false,
        } satisfies ICommunityPlatformBannedWord.ICreate,
      },
    );
  typia.assert(create2);
  TestValidator.notEquals(
    "Banned word phrases must be unique",
    create1.phrase,
    create2.phrase,
  );

  // Edit 1a: Update phrase
  const newPhrase = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 7,
    wordMax: 15,
  });
  const updated1 =
    await api.functional.communityPlatform.admin.bannedWords.update(
      connection,
      {
        bannedWordId: create1.id,
        body: {
          phrase: newPhrase,
        } satisfies ICommunityPlatformBannedWord.IUpdate,
      },
    );
  typia.assert(updated1);
  TestValidator.equals(
    "Phrase is changed after update",
    updated1.phrase,
    newPhrase,
  );
  TestValidator.equals(
    "Id remains unchanged after phrase update",
    updated1.id,
    create1.id,
  );

  // Edit 1b: Update category
  const newCategory = "hate";
  const updated2 =
    await api.functional.communityPlatform.admin.bannedWords.update(
      connection,
      {
        bannedWordId: create1.id,
        body: {
          category: newCategory,
        } satisfies ICommunityPlatformBannedWord.IUpdate,
      },
    );
  typia.assert(updated2);
  TestValidator.equals("Category updated", updated2.category, newCategory);
  TestValidator.equals(
    "Id remains unchanged after category update",
    updated2.id,
    create1.id,
  );

  // Edit 1c: Update enabled toggle
  const updated3 =
    await api.functional.communityPlatform.admin.bannedWords.update(
      connection,
      {
        bannedWordId: create1.id,
        body: {
          enabled: !updated2.enabled,
        } satisfies ICommunityPlatformBannedWord.IUpdate,
      },
    );
  typia.assert(updated3);
  TestValidator.equals("Enabled toggled", updated3.enabled, !updated2.enabled);

  // 3. Duplicate phrase conflict
  await TestValidator.error(
    "Update phrase to duplicate value must fail",
    async () => {
      await api.functional.communityPlatform.admin.bannedWords.update(
        connection,
        {
          bannedWordId: create2.id,
          body: {
            phrase: updated3.phrase,
          } satisfies ICommunityPlatformBannedWord.IUpdate,
        },
      );
    },
  );

  // 4. Enable/disable toggle roundtrip
  const toggleEnabled = async (
    targetId: string & tags.Format<"uuid">,
    from: boolean,
  ) => {
    const changed =
      await api.functional.communityPlatform.admin.bannedWords.update(
        connection,
        {
          bannedWordId: targetId,
          body: {
            enabled: !from,
          } satisfies ICommunityPlatformBannedWord.IUpdate,
        },
      );
    typia.assert(changed);
    TestValidator.equals("Enable/disable round trip", changed.enabled, !from);
    // Revert
    const reverted =
      await api.functional.communityPlatform.admin.bannedWords.update(
        connection,
        {
          bannedWordId: targetId,
          body: {
            enabled: from,
          } satisfies ICommunityPlatformBannedWord.IUpdate,
        },
      );
    typia.assert(reverted);
    TestValidator.equals(
      "Enable/disable can be reverted",
      reverted.enabled,
      from,
    );
  };
  await toggleEnabled(create2.id, create2.enabled);

  // 5. Not found for random id
  const notExistId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Update non-existent bannedWordId must fail",
    async () => {
      await api.functional.communityPlatform.admin.bannedWords.update(
        connection,
        {
          bannedWordId: notExistId,
          body: {
            phrase: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 5,
              wordMax: 8,
            }),
          } satisfies ICommunityPlatformBannedWord.IUpdate,
        },
      );
    },
  );
}
