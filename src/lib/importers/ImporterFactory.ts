// src/lib/importers/ImporterFactory.ts
// Routes a product URL to the correct importer.
// Adding a new retailer: create the importer file + add one entry to REGISTRY.

import type { ProductImporter } from './types.js';
import { MyntraImporter } from './MyntraImporter.js';
import { AjioImporter } from './AjioImporter.js';
import { AmazonImporter } from './AmazonImporter.js';
import { FlipkartImporter } from './FlipkartImporter.js';
import { HmImporter } from './HmImporter.js';
import { ZaraImporter } from './ZaraImporter.js';
import { GenericImporter } from './GenericImporter.js';

/**
 * Registry of all specific importers (ordered by priority).
 * The GenericImporter is NOT listed here — it is the automatic fallback.
 *
 * To add a new retailer:
 *   1. Create src/lib/importers/YourImporter.ts
 *   2. Import it here
 *   3. Add an instance to REGISTRY
 */
const REGISTRY: ProductImporter[] = [
  new MyntraImporter(),
  new AjioImporter(),
  new AmazonImporter(),
  new FlipkartImporter(),
  new HmImporter(),
  new ZaraImporter(),
];

const GENERIC = new GenericImporter();

export class ImporterFactory {
  /**
   * Returns the most appropriate importer for the given URL.
   * Falls back to GenericImporter if no specific importer matches.
   */
  static getImporter(url: string): ProductImporter {
    for (const importer of REGISTRY) {
      if (importer.canHandle(url)) {
        return importer;
      }
    }
    return GENERIC;
  }

  /**
   * Detects the retailer name for a URL without running the full import.
   * Used by the UI to display "Detected Retailer: Myntra" immediately.
   */
  static detectRetailerName(url: string): string {
    const importer = ImporterFactory.getImporter(url);
    // If matched a specific importer, use its name
    if (importer !== GENERIC) return importer.retailerName;
    // Otherwise let the generic importer do domain detection
    return GENERIC.retailerName;
  }
}
