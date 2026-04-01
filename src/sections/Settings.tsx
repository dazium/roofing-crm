import type { StorageMeta, StorageDriver } from '../storage';
import type { AppData, CompanyProfile, MaterialPriceSetting } from '../types';
import { companyDisplayName, companyShortName, companyTagline, openEmailClient, openExternalUrl, openPhoneDialer } from '../lib';

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
      </div>
    </section>
  );
};
