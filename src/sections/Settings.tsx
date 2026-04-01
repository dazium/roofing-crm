import type { StorageMeta, StorageDriver } from '../storage';
import type { AppData, MaterialPriceSetting } from '../types';
import { companyProfile, openEmailClient, openExternalUrl, openPhoneDialer } from '../lib';

interface SettingsProps {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
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
  storageMode,
  storageMessage,
  storageMeta,
  exportBackup,
  importInputRef,
  handleImport
}) => {
  function updateMaterialPrice(id: string, field: keyof Pick<MaterialPriceSetting, 'label' | 'unit' | 'price' | 'supplier'>, value: string) {
    setData((prev) => ({
      ...prev,
      materialPrices: prev.materialPrices.map((item) => item.id === id
        ? {
            ...item,
            [field]: field === 'price' ? Math.max(0, Number(value) || 0) : value,
            updatedAt: new Date().toISOString(),
          }
        : item),
    }));
  }

  const latestPricingUpdate = data.materialPrices.reduce<string | null>((latest, item) => {
    if (!latest || item.updatedAt > latest) return item.updatedAt;
    return latest;
  }, null);

  return (
    <section className="content-grid two-col">
      <div className="column-stack">
        <div className="card">
          <div className="section-head">
            <h3>Company settings</h3>
            <span>Public info imported</span>
          </div>
          <div className="detail-stack company-stack">
            <div>
              <span>Company</span>
              <strong>{companyProfile.name}</strong>
            </div>
            <div>
              <span>Tagline</span>
              <strong>{companyProfile.tagline}</strong>
            </div>
            <div>
              <span>Service area</span>
              <strong>{companyProfile.city}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>
                <button type="button" className="address-link" onClick={() => openPhoneDialer(companyProfile.phone)}>
                  {companyProfile.phone}
                </button>
              </strong>
            </div>
            <div>
              <span>Email</span>
              <strong>
                <button type="button" className="address-link" onClick={() => openEmailClient(companyProfile.email)}>
                  {companyProfile.email}
                </button>
              </strong>
            </div>
            <div>
              <span>Website</span>
              <strong>
                <button type="button" className="address-link" onClick={() => openExternalUrl(`https://${companyProfile.website}`)}>
                  {companyProfile.website}
                </button>
              </strong>
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
            <span>Manual pricing table</span>
          </div>
          <div className="list-grid">
            <p>Enter the prices you want Roof Math and proposal generation to use on both desktop and Android.</p>
            <div className="detail-stack">
              <div>
                <span>Last updated</span>
                <strong>{latestPricingUpdate ? new Date(latestPricingUpdate).toLocaleString() : 'Not set'}</strong>
              </div>
            </div>
            <div className="proposal-table">
              <div className="proposal-table-head">
                <span>Material</span>
                <span>Unit</span>
                <span>Price</span>
                <span>Supplier</span>
              </div>
              {data.materialPrices.map((item) => (
                <div className="proposal-row" key={item.id}>
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
              ))}
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#627285' }}>
              Manual prices are saved with the rest of your app data and reused in both Roof Math and proposal line items.
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <h3>What changed in this build</h3>
            <span>Operational upgrades</span>
          </div>
          <div className="list-grid">
            {[
              'Desktop app now reads and writes through native SQLite',
              'Automatic JSON backups are created on each desktop save',
              'Proposal screen can export a customer-facing estimate PDF',
              'Inspection screen can open the camera directly on mobile devices'
            ].map((item) => (
              <div className="kanban-card" key={item}>{item}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
