import { config } from '../config.js';
import { deleteProduct } from '../shopify/productDelete.js';
import {
  listDesignAnalytics,
  type DesignAnalyticsRecord,
} from './designAnalyticsService.js';

export interface CleanupCandidateOptions {
  olderThanDays: number;
  limit: number;
}

export interface CleanupDeleteResult {
  ok: boolean;
  dryRun: boolean;
  olderThanDays: number;
  candidates: number;
  deleted: Array<{ designId: string; productId: string; productGid: string }>;
  warnings: string[];
}

function cutoffDate(olderThanDays: number): Date {
  const days = Math.max(1, Math.floor(olderThanDays));
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function listArchivedCleanupCandidates(
  options: CleanupCandidateOptions,
): Promise<DesignAnalyticsRecord[]> {
  const records = await listDesignAnalytics(options.limit);
  const cutoff = cutoffDate(options.olderThanDays).getTime();
  return records.filter((record) => {
    if (record.productStatus !== 'ARCHIVED') return false;
    const created = new Date(record.createdAt).getTime();
    return Number.isFinite(created) && created < cutoff;
  });
}

export async function deleteArchivedDesignProducts(
  options: CleanupCandidateOptions,
  confirm: string,
): Promise<CleanupDeleteResult> {
  const candidates = await listArchivedCleanupCandidates(options);
  const warnings: string[] = [];

  if (!config.allowDesignProductDelete) {
    return {
      ok: true,
      dryRun: true,
      olderThanDays: options.olderThanDays,
      candidates: candidates.length,
      deleted: [],
      warnings: ['Deletion is disabled. Set ALLOW_DESIGN_PRODUCT_DELETE=true to enable it.'],
    };
  }

  if (confirm !== 'DELETE_ARCHIVED_DESIGNS') {
    return {
      ok: false,
      dryRun: true,
      olderThanDays: options.olderThanDays,
      candidates: candidates.length,
      deleted: [],
      warnings: ['Missing confirmation. Type DELETE_ARCHIVED_DESIGNS to delete.'],
    };
  }

  const deleted: CleanupDeleteResult['deleted'] = [];
  for (const record of candidates) {
    try {
      await deleteProduct(record.productGid);
      deleted.push({
        designId: record.designId,
        productId: record.productId,
        productGid: record.productGid,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`Delete failed for ${record.designId || record.productId}: ${message}`);
    }
  }

  return {
    ok: warnings.length === 0,
    dryRun: false,
    olderThanDays: options.olderThanDays,
    candidates: candidates.length,
    deleted,
    warnings,
  };
}
