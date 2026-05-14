import { useState } from 'react';
import type { StorageMeta, StorageDriver, MaterialPrice } from '../storage';
import type { AppData, CompanyProfile, MaterialPriceHistoryEntry, MaterialPriceSetting } from '../types';
import { companyDisplayName, companyShortName, companyTagline, openEmailClient, openExternalUrl, openPhoneDialer, uid } from '../lib';

interface SettingsProps {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  companyProfile: CompanyProfile;
  storageMode: StorageDriver;
  storageMessage: string;
  storageMeta: StorageMeta;
  exportBackup: () => void;
  importInputRef: React.RefObject<HTMLInputElement | null>;
  handleImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  data,
  setData,
  companyProfile,
  storageMode,
  storageMessage,
  storageMeta,
  exportBackup,
  importInputRef,
  handleImport
}) => {
  const [scraperMessage, setScraperMessage] = useState('');
  const [isScrapingPrices, setIsScrapingPrices] = useState(false);

  function materialSourceLabel(item: MaterialPriceSetting) {
    return item.supplier.trim() || 'Manual';
  }

  function materialTimestampLabel(item: MaterialPriceSetting) {
    const timestamp = Date.parse(item.updatedAt);
    return Number.isNaN(timestamp) ? 'Not available' : new Date(timestamp).toLocaleString();
  }

  function isScrapedMaterial(item: MaterialPriceSetting) {
    return item.supplier.toLowerCase().includes('scrape');
  }

  function updateCompanyProfile(field: keyof CompanyProfile, value: string) {
    setData((prev) => ({
      ...prev,
      companyProfile: {
        ...prev.companyProfile,
        [field]: value,
      },
    }));
  }

  function updateMaterialPrice(id: string, field: keyof Pick<MaterialPriceSetting, 'label' | 'unit' | 'price' | 'supplier'>, value: string) {
    setData((prev) => ({
      ...prev,
      materialPrices: prev.materialPrices.map((item) => item.id === id
        ? {
            ...item,
            [field]: field === 'price' ? Math.max(0, Number(value) || 0) : value,
            supplier: field === 'supplier'
              ? value
              : isScrapedMaterial(item)
                ? 'Manual override'
                : item.supplier,
            updatedAt: new Date().toISOString(),
          }
        : item),
    }));
  }

  const latestPricingUpdate = data.materialPrices.reduce<string | null>((latest, item) => {
    if (!latest || item.updatedAt > latest) return item.updatedAt;
    return latest;
  }, null);

  const scrapedProductMap: Record<string, { id: string; unit: MaterialPriceSetting['unit']; label?: string }> = {
    'CertainTeed Landmark Shingles': { id: 'mat-shingles', unit: 'bundle', label: 'CertainTeed Landmark shingles' },
    'IKO Dynasty Shingles': { id: 'mat-shingles', unit: 'bundle', label: 'IKO Dynasty shingles' },
    'Ice & Water Shield': { id: 'mat-ice-water', unit: 'roll' },
    'Ridge Vent': { id: 'mat-ridge-vent', unit: 'lf' },
    'Hip & Ridge Cap': { id: 'mat-ridge-cap', unit: 'bundle' },
    'Starters': { id: 'mat-starter', unit: 'bundle', label: 'Starter strip' },
    'Drip Edge': { id: 'mat-drip-edge', unit: 'piece' },
  };

  const scraperManagedMaterialIds = new Set(Object.values(scrapedProductMap).map((entry) => entry.id));
  const scraperManagedCount = data.materialPrices.filter((item) => scraperManagedMaterialIds.has(item.id)).length;
  const scrapedMaterialCount = data.materialPrices.filter((item) => isScrapedMaterial(item)).length;
  const recentPriceHistory = [...data.materialPriceHistory]
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    .slice(0, 16);

  async function syncScrapedPrices() {
    if (!window.roofingcrmDesktop?.runMaterialScraper || !window.roofingcrmDesktop?.getLatestMaterialPrices) {
      setScraperMessage('Desktop scraping is only available in the Electron app.');
      return;
    }

    const mappedManualCount = data.materialPrices.filter((item) => scraperManagedMaterialIds.has(item.id) && !isScrapedMaterial(item)).length;
    if (mappedManualCount > 0) {
      const confirmed = window.confirm(
        `Refresh scraped prices for ${mappedManualCount} mapped material(s)? This will overwrite their current manual price and supplier fields.`
      );
      if (!confirmed) {
        setScraperMessage('Scraper refresh cancelled. Existing material prices were left unchanged.');
        return;
      }
    }

    setIsScrapingPrices(true);
    setScraperMessage('Scraping latest material prices...');

    try {
      const scrapeResult = await window.roofingcrmDesktop.runMaterialScraper();
      if (!scrapeResult.ok) {
        const stderr = scrapeResult.stderr?.trim();
        const reason = stderr || scrapeResult.message || 'Unknown scraper failure';
        setScraperMessage(
          `Material scrape failed${typeof scrapeResult.code === 'number' ? ` (exit ${scrapeResult.code})` : ''}: ${reason}`
        );
        return;
      }

      const scrapedPrices = await window.roofingcrmDesktop.getLatestMaterialPrices();
      const candidatesByMaterial = new Map<string, MaterialPrice[]>();

      for (const row of scrapedPrices) {
        const mapped = scrapedProductMap[row.product];
        if (!mapped) continue;
        const entries = candidatesByMaterial.get(mapped.id) ?? [];
        entries.push(row);
        candidatesByMaterial.set(mapped.id, entries);
      }

      if (!candidatesByMaterial.size) {
        setScraperMessage('Scraper completed, but no mapped material prices were returned. Check product selectors in scripts/scrape-prices.js.');
        return;
      }

      let changedCount = 0;
      let newestScrapeAt: string | null = null;

      setData((prev) => ({
        ...prev,
        materialPrices: prev.materialPrices.map((item) => {
          const candidates = candidatesByMaterial.get(item.id);
          if (!candidates || !candidates.length) return item;
          const mappedRow = [...candidates].sort((a, b) => {
            if (b.scraped_at !== a.scraped_at) return b.scraped_at.localeCompare(a.scraped_at);
            return a.price - b.price;
          })[0];
          const mappedMeta = scrapedProductMap[mappedRow.product];

          if (!newestScrapeAt || mappedRow.scraped_at > newestScrapeAt) {
            newestScrapeAt = mappedRow.scraped_at;
          }

          const nextItem = {
            ...item,
            label: mappedMeta.label ?? item.label,
            unit: mappedMeta.unit,
            price: Math.max(0, Number(mappedRow.price) || 0),
            supplier: `${mappedRow.store} scrape (${mappedRow.product})`,
            updatedAt: mappedRow.scraped_at,
          };

          if (
            nextItem.label !== item.label ||
            nextItem.unit !== item.unit ||
            nextItem.price !== item.price ||
            nextItem.supplier !== item.supplier ||
            nextItem.updatedAt !== item.updatedAt
          ) {
            changedCount += 1;
          }

          return nextItem;
        }),
        materialPriceHistory: [
          ...([
            ...candidatesByMaterial.entries(),
          ].flatMap(([materialId, rows]) => {
            const material = prev.materialPrices.find((item) => item.id === materialId);
            return rows.map((row): MaterialPriceHistoryEntry => ({
              id: uid(),
              materialId,
              materialLabel: material?.label ?? materialId,
              product: row.product,
              price: Math.max(0, Number(row.price) || 0),
              unit: row.unit,
              store: row.store,
              scrapedAt: row.scraped_at,
              recordedAt: new Date().toISOString(),
            }));
          }) as MaterialPriceHistoryEntry[]),
          ...prev.materialPriceHistory,
        ].slice(0, 240),
      }));

      setScraperMessage(
        changedCount > 0
          ? `Updated ${changedCount} material price${changedCount === 1 ? '' : 's'} from desktop scrape data${newestScrapeAt ? ` (latest scrape ${new Date(newestScrapeAt).toLocaleString()})` : ''}.`
          : 'Scraper completed, but mapped material prices were already up to date.'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown scraper error';
      setScraperMessage(`Material scrape failed: ${message}`);
    } finally {
      setIsScrapingPrices(false);
    }
  }

  return (
    <section className="content-grid two-col">
      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>Company settings</h3>
            <span>Used across proposals, PDF exports, and billing</span>
          </div>
          <div className="form-grid compact-grid">
            <div className="workflow-callout">
              <strong>{companyDisplayName(companyProfile)}</strong>
              <span>{companyTagline(companyProfile)}</span>
            </div>
            <div className="split-grid">
              <label className="field">
                <span>Company name</span>
                <input
                  value={companyProfile.name}
                  placeholder="Your Roofing Company"
                  onChange={(event) => updateCompanyProfile('name', event.target.value)}
                />
              </label>
              <label className="field">
                <span>Short name</span>
                <input
                  value={companyProfile.shortName}
                  placeholder="YRC"
                  onChange={(event) => updateCompanyProfile('shortName', event.target.value)}
                />
              </label>
            </div>
            <label className="field">
              <span>Tagline</span>
              <input
                value={companyProfile.tagline}
                placeholder="What shows on proposals and PDFs"
                onChange={(event) => updateCompanyProfile('tagline', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Service area</span>
              <input
                value={companyProfile.city}
                placeholder="Windsor, ON"
                onChange={(event) => updateCompanyProfile('city', event.target.value)}
              />
            </label>
            <div className="split-grid">
              <label className="field">
                <span>Phone</span>
                <input
                  value={companyProfile.phone}
                  placeholder="(519) 555-0000"
                  onChange={(event) => updateCompanyProfile('phone', event.target.value)}
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  value={companyProfile.email}
                  placeholder="office@yourcompany.com"
                  onChange={(event) => updateCompanyProfile('email', event.target.value)}
                />
              </label>
            </div>
            <label className="field">
              <span>Website</span>
              <input
                value={companyProfile.website}
                placeholder="yourcompany.com"
                onChange={(event) => updateCompanyProfile('website', event.target.value)}
              />
            </label>
            <div className="detail-stack company-stack">
              <div>
                <span>Preview name</span>
                <strong>{companyDisplayName(companyProfile)}</strong>
              </div>
              <div>
                <span>Preview short name</span>
                <strong>{companyShortName(companyProfile)}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>
                  {companyProfile.phone ? (
                    <button type="button" className="address-link" onClick={() => openPhoneDialer(companyProfile.phone)}>
                      {companyProfile.phone}
                    </button>
                  ) : 'Not set'}
                </strong>
              </div>
              <div>
                <span>Email</span>
                <strong>
                  {companyProfile.email ? (
                    <button type="button" className="address-link" onClick={() => openEmailClient(companyProfile.email)}>
                      {companyProfile.email}
                    </button>
                  ) : 'Not set'}
                </strong>
              </div>
              <div>
                <span>Website</span>
                <strong>
                  {companyProfile.website ? (
                    <button type="button" className="address-link" onClick={() => openExternalUrl(`https://${companyProfile.website}`)}>
                      {companyProfile.website}
                    </button>
                  ) : 'Not set'}
                </strong>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="section-head">
            <h3>Data safety</h3>
            <span>{storageMode === 'sqlite-native' ? 'Native SQLite storage' : 'Browser storage fallback'}</span>
          </div>
          <div className="list-grid">
            <div className="status-note">{storageMessage}</div>
            <div className="detail-stack">
              <div>
                <span>Storage engine</span>
                <strong>{storageMode === 'sqlite-native' ? 'SQLite' : 'Local browser storage'}</strong>
              </div>
              {storageMeta.dbPath && (
                <div>
                  <span>SQLite file</span>
                  <strong>{storageMeta.dbPath}</strong>
                </div>
              )}
              {storageMeta.backupDir && (
                <div>
                  <span>Automatic backup folder</span>
                  <strong>{storageMeta.backupDir}</strong>
                </div>
              )}
              {storageMeta.lastBackupAt && (
                <div>
                  <span>Last automatic backup</span>
                  <strong>{new Date(storageMeta.lastBackupAt).toLocaleString()}</strong>
                </div>
              )}
              {storageMeta.legacyPath && (
                <div>
                  <span>Legacy JSON path</span>
                  <strong>{storageMeta.legacyPath}</strong>
                </div>
              )}
            </div>
            <div className="settings-actions">
              <button className="ghost" onClick={exportBackup}>Export backup</button>
              <button className="ghost" onClick={() => importInputRef.current?.click()}>
                Import backup
              </button>
            </div>
            <input 
              ref={importInputRef} 
              className="hidden-input" 
              type="file" 
              accept="application/json" 
              onChange={handleImport} 
            />
          </div>
        </div>
      </div>
      
      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>Material prices</h3>
            <span>Manual pricing table with desktop scrape support</span>
          </div>
          <div className="list-grid">
            <p>Enter the prices you want Roof Math and proposal generation to use on both desktop and Android.</p>
            <div className="status-note">
              Shingle scrape mapping decision: both CertainTeed and IKO scrape into one editable shingles slot (`mat-shingles`). The most recent scrape wins; if timestamps tie, lower price wins.
            </div>
            <div className="detail-stack">
              <div>
                <span>Last updated</span>
                <strong>{latestPricingUpdate ? new Date(latestPricingUpdate).toLocaleString() : 'Not set'}</strong>
              </div>
              <div>
                <span>Scraper-managed materials</span>
                <strong>{scraperManagedCount} mapped, {scrapedMaterialCount} currently marked as scraped</strong>
              </div>
            </div>
            <div className="status-note">
              Only mapped materials are refreshed from the desktop scraper. Anything else stays manual unless you edit it yourself.
            </div>
            {window.roofingcrmDesktop?.runMaterialScraper && (
              <div className="settings-actions">
                <button className="ghost" onClick={syncScrapedPrices} disabled={isScrapingPrices}>
                  {isScrapingPrices ? 'Refreshing prices...' : 'Refresh from scraper'}
                </button>
              </div>
            )}
            {scraperMessage ? <div className="status-note">{scraperMessage}</div> : null}
            <div className="proposal-table material-price-table">
              <div className="proposal-table-head material-price-table-head">
                <span>Material</span>
                <span>Unit</span>
                <span>Price</span>
                <span>Supplier</span>
              </div>
              {data.materialPrices.map((item) => (
                <div className="material-price-card" key={item.id}>
                  <div className="proposal-row material-price-row">
                  <input value={item.label} onChange={(event) => updateMaterialPrice(item.id, 'label', event.target.value)} />
                  <select value={item.unit} onChange={(event) => updateMaterialPrice(item.id, 'unit', event.target.value)}>
                    <option value="bundle">bundle</option>
                    <option value="roll">roll</option>
                    <option value="piece">piece</option>
                    <option value="lf">lf</option>
                    <option value="sq">sq</option>
                  </select>
                  <input type="number" min={0} step="0.01" value={item.price} onChange={(event) => updateMaterialPrice(item.id, 'price', event.target.value)} />
                  <input value={item.supplier} onChange={(event) => updateMaterialPrice(item.id, 'supplier', event.target.value)} />
                  </div>
                  <div className="material-price-meta">
                    <span>Status: {isScrapedMaterial(item) ? 'Scraped' : 'Manual'}{scraperManagedMaterialIds.has(item.id) ? ' • scraper-mapped item' : ''}</span>
                    <span>Source: {materialSourceLabel(item)}</span>
                    <span>Updated: {materialTimestampLabel(item)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#627285' }}>
              Manual prices are saved with the rest of your app data and reused in both Roof Math and proposal line items.
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <h3>Scrape history</h3>
            <span>Latest material price pulls from desktop scraper</span>
          </div>
          <div className="list-grid">
            {recentPriceHistory.length ? (
              <div className="linked-record-list">
                {recentPriceHistory.map((entry) => (
                  <div key={entry.id} className="linked-record-row">
                    <strong>{entry.materialLabel} · {entry.price.toFixed(2)} ({entry.unit})</strong>
                    <span>{entry.product} · {entry.store}</span>
                    <small>Scraped {new Date(entry.scrapedAt).toLocaleString()} · logged {new Date(entry.recordedAt).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">No scrape history yet. Run the desktop scraper to start logging entries.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
