import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedWord";
import type { IPageICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBannedWord";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for advanced listing/filter/pagination of banned words by admin
 *
 * Validates:
 *
 * - Admin authentication requirement
 * - Banned word creation with diverse phrases/categories/enabled states
 * - Filtering by phrase substring, category, enabled flag
 * - Pagination (limit/page) and result count
 * - Edge cases (broad filter, invalid filter, empty result)
 *
 * Steps:
 *
 * 1. Register a new admin for authentication
 * 2. Seed several banned words with varying attributes
 * 3. Request with no filters – expect all seeded words
 * 4. Filter by substring – expect only matching words
 * 5. Filter by category – expect only words created with that category
 * 6. Filter by enabled state – expect only active/inactive words
 * 7. Combined filters (e.g., substring+category+enabled)
 * 8. Pagination requests (page/limit combos) – validate size/count
 * 9. Invalid filter (nonsense category) – expect empty
 * 10. Validate returned words and pagination structure only on ISummary fields
 */
export async function test_api_banned_word_index_with_filter_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new admin for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Seed several banned words with varying attributes (never null-category)
  const seedWords = [
    { phrase: "spamword1", category: "spam", enabled: true },
    { phrase: "badword2", category: "profanity", enabled: true },
    { phrase: "offtopic3", category: "off_topic", enabled: false },
    { phrase: "testfilter4", category: "test", enabled: true },
    { phrase: "offtopic5", category: "off_topic", enabled: true },
    { phrase: "fake6", enabled: false },
  ];
  const created: ICommunityPlatformBannedWord[] = [];
  for (const seed of seedWords) {
    const wordCreate: ICommunityPlatformBannedWord.ICreate = {
      phrase: `${seed.phrase}_${RandomGenerator.alphaNumeric(6)}`,
      enabled: seed.enabled,
    };
    if (typeof seed.category === "string") wordCreate.category = seed.category;
    const w = await api.functional.communityPlatform.admin.bannedWords.create(
      connection,
      {
        body: wordCreate,
      },
    );
    typia.assert(w);
    created.push(w);
  }

  // 3. Request with no filters – expect all seeded words (paginated)
  {
    const res = await api.functional.communityPlatform.admin.bannedWords.index(
      connection,
      { body: {} satisfies ICommunityPlatformBannedWord.IRequest },
    );
    typia.assert(res);
    TestValidator.equals(
      "no filter returns all created",
      res.data.length,
      created.length,
    );
  }

  // 4. Filter by phrase substring (using part of known phrase)
  {
    const partial = created[0].phrase.slice(2, 7);
    const expected = created.filter((w) => w.phrase.includes(partial));
    const res = await api.functional.communityPlatform.admin.bannedWords.index(
      connection,
      {
        body: {
          search: partial,
        } satisfies ICommunityPlatformBannedWord.IRequest,
      },
    );
    typia.assert(res);
    TestValidator.equals(
      "substring filter count",
      res.data.length,
      expected.length,
    );
    TestValidator.predicate(
      "substring match",
      res.data.every((w) => w.phrase.includes(partial)),
    );
  }

  // 5. Filter by category (only using string-present categories)
  {
    const catIdx = seedWords.findIndex((s) => typeof s.category === "string");
    if (catIdx >= 0) {
      const categoryFilter = seedWords[catIdx].category as string;
      const expected = created.filter(
        (_, idx) => seedWords[idx].category === categoryFilter,
      );
      const res =
        await api.functional.communityPlatform.admin.bannedWords.index(
          connection,
          {
            body: {
              category: categoryFilter,
            } satisfies ICommunityPlatformBannedWord.IRequest,
          },
        );
      typia.assert(res);
      TestValidator.equals(
        "category filter count",
        res.data.length,
        expected.length,
      );
      TestValidator.predicate(
        "all entries matching category were found",
        res.data.every((summary) => expected.some((w) => w.id === summary.id)),
      );
    }
  }

  // 6. Filter by enabled
  {
    const flag = false;
    const expected = created.filter((w) => w.enabled === flag);
    const res = await api.functional.communityPlatform.admin.bannedWords.index(
      connection,
      {
        body: { enabled: flag } satisfies ICommunityPlatformBannedWord.IRequest,
      },
    );
    typia.assert(res);
    TestValidator.equals(
      "enabled filter count",
      res.data.length,
      expected.length,
    );
    TestValidator.predicate(
      "all returned are enabled === false",
      res.data.every((w) => w.enabled === flag),
    );
  }

  // 7. Combined filters (substring+category+enabled)
  {
    const comboIdx = seedWords.findIndex((s) => typeof s.category === "string");
    if (comboIdx >= 0) {
      const example = created[comboIdx];
      const partial = example.phrase.slice(1, 5);
      const category = seedWords[comboIdx].category as string;
      const enabled = seedWords[comboIdx].enabled;
      const expected = created.filter(
        (w, idx) =>
          seedWords[idx].category === category &&
          seedWords[idx].enabled === enabled &&
          w.phrase.includes(partial),
      );
      const res =
        await api.functional.communityPlatform.admin.bannedWords.index(
          connection,
          {
            body: {
              search: partial,
              category,
              enabled,
            } satisfies ICommunityPlatformBannedWord.IRequest,
          },
        );
      typia.assert(res);
      TestValidator.equals(
        "combined filter count",
        res.data.length,
        expected.length,
      );
      TestValidator.predicate(
        "all match all filter criteria",
        res.data.every((summary) =>
          expected.some(
            (w) =>
              w.id === summary.id &&
              w.phrase.includes(partial) &&
              w.enabled === enabled,
          ),
        ),
      );
    }
  }

  // 8. Pagination: page 1, limit 2
  {
    const limit = 2;
    const res = await api.functional.communityPlatform.admin.bannedWords.index(
      connection,
      {
        body: {
          limit,
          page: 1,
        } satisfies ICommunityPlatformBannedWord.IRequest,
      },
    );
    typia.assert(res);
    TestValidator.equals(
      "limit page1",
      res.data.length,
      Math.min(limit, created.length),
    );
    TestValidator.equals("pagination metadata page", res.pagination.current, 1);
    TestValidator.equals(
      "pagination metadata limit",
      res.pagination.limit,
      limit,
    );
    TestValidator.equals(
      "pagination metadata records",
      res.pagination.records,
      created.length,
    );
  }

  // 9. Pagination: page 2, limit 3 (should show next 3 words or less)
  {
    const limit = 3;
    const page = 2;
    const res = await api.functional.communityPlatform.admin.bannedWords.index(
      connection,
      { body: { limit, page } satisfies ICommunityPlatformBannedWord.IRequest },
    );
    typia.assert(res);
    const expectedCount = Math.max(0, created.length - limit * (page - 1));
    TestValidator.equals(
      "pagination page2 count",
      res.data.length,
      Math.min(limit, expectedCount),
    );
    TestValidator.equals(
      "pagination page2 metadata",
      res.pagination.current,
      page,
    );
  }

  // 10. Invalid filter: category nonsense (use string; null not allowed)
  {
    const nonsense = RandomGenerator.alphaNumeric(12);
    const res = await api.functional.communityPlatform.admin.bannedWords.index(
      connection,
      {
        body: {
          category: nonsense,
        } satisfies ICommunityPlatformBannedWord.IRequest,
      },
    );
    typia.assert(res);
    TestValidator.equals("invalid category yields empty", res.data.length, 0);
  }
}
