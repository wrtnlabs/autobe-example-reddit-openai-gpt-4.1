import { tags } from "typia";

export namespace IPage {
  /**
   * Standard schema describing pagination metadata for page containers.
   *
   * Used across all paginated API responses as a required, common component.
   */
  export type IPagination = {
    /**
     * Current page number of paginated results.
     *
     * Reflects the position of the search within the available pages.
     */
    current: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "uint32";
      }>;

    /**
     * Page size (number of results per page).
     *
     * Defines pagination window size.
     */
    limit: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "uint32";
      }>;

    /** Total number of result records matched by the search/filter. */
    records: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "uint32";
      }>;

    /**
     * Total number of pages in the result set (computed as records / limit,
     * rounded up).
     *
     * Used for pagination navigation.
     */
    pages: number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{
        format: "uint32";
      }>;
  };
}
