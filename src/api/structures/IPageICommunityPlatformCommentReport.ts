import { IPage } from "./IPage";
import { ICommunityPlatformCommentReport } from "./ICommunityPlatformCommentReport";

export namespace IPageICommunityPlatformCommentReport {
  /**
   * Paginated collection of comment report summaries.
   *
   * Provides a list of comment report summaries matching filter/search
   * criteria, with standard pagination info.
   */
  export type ISummary = {
    pagination: IPage.IPagination;
    data: ICommunityPlatformCommentReport.ISummary[];
  };
}
