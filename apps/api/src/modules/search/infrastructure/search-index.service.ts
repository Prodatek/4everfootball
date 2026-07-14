import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch } from 'meilisearch';
import type { SearchIndexName } from '../domain/search-index';

/**
 * Thin wrapper around the Meilisearch client. Every write is fire-and-forget
 * from the caller's perspective: search is a supporting feature, not a
 * source of truth, so a Meilisearch outage must never fail a Team/Player/
 * Competition/News write. Errors are logged and swallowed here rather than
 * propagated.
 */
@Injectable()
export class SearchIndexService {
  private readonly logger = new Logger(SearchIndexService.name);
  private readonly client: MeiliSearch;

  constructor(private readonly config: ConfigService) {
    this.client = new MeiliSearch({
      host: this.config.get<string>('MEILISEARCH_HOST') as string,
      apiKey: this.config.get<string>('MEILISEARCH_API_KEY'),
    });
  }

  async upsertDocument<T extends { id: string }>(
    indexName: SearchIndexName,
    document: T,
  ): Promise<void> {
    try {
      await this.client.index(indexName).addDocuments([document]);
    } catch (error) {
      this.logger.warn(
        `Failed to index document ${document.id} in ${indexName}: ${(error as Error).message}`,
      );
    }
  }

  async deleteDocument(indexName: SearchIndexName, id: string): Promise<void> {
    try {
      await this.client.index(indexName).deleteDocument(id);
    } catch (error) {
      this.logger.warn(
        `Failed to delete document ${id} from ${indexName}: ${(error as Error).message}`,
      );
    }
  }

  async search(
    indexName: SearchIndexName,
    query: string,
    limit: number,
  ): Promise<Record<string, unknown>[]> {
    try {
      const result = await this.client
        .index(indexName)
        .search(query, { limit });
      return result.hits;
    } catch (error) {
      this.logger.warn(
        `Search against ${indexName} failed: ${(error as Error).message}`,
      );
      return [];
    }
  }
}
