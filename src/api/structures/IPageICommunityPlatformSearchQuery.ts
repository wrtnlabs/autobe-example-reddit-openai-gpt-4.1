import { IPage } from "./IPage";
import { ICommunityPlatformSearchQuery } from "./ICommunityPlatformSearchQuery";

export namespace IPageICommunityPlatformSearchQuery {
  /**
   * Paginated collection of search query summary records.
   *
   * Returns multiple community platform search log summaries with pagination
   * information.
   */
  export type ISummary = {
    pagination: IPage.IPagination;
    data: ICommunityPlatformSearchQuery.ISummary[];
  };
}
