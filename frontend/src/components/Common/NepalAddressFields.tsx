import React, { useMemo } from 'react';
// @ts-ignore
import {
  getProvinces,
  getDistrictsByProvince,
  getLocalLevelsByDistrict,
  composeNepalAddress
} from '../../data/nepalLocalLevels';

export interface NepalLocation {
  provinceName: string;
  districtName: string;
  municipalityName: string;
  ward: string;
  tole?: string;
}

export const EMPTY_NEPAL_LOCATION: NepalLocation = {
  provinceName: '',
  districtName: '',
  municipalityName: '',
  ward: '',
  tole: ''
};

export interface NepalAddressFieldsProps {
  value?: NepalLocation;
  onChange: (nextLocation: NepalLocation, composedAddress: string) => void;
  lang?: 'en' | 'np';
  disabled?: boolean;
  title?: string;
  badge?: string;
  required?: boolean;
}

export function formatFullNepalAddress(loc: NepalLocation, lang: 'en' | 'np' = 'en'): string {
  if (!loc || (!loc.provinceName && !loc.districtName && !loc.municipalityName)) return '';
  const base = composeNepalAddress(loc, lang);
  if (loc.tole && loc.tole.trim()) {
    return `${loc.tole.trim()}, ${base}`;
  }
  return base;
}

export const NepalAddressFields: React.FC<NepalAddressFieldsProps> = ({
  value = EMPTY_NEPAL_LOCATION,
  onChange,
  lang = 'en',
  disabled = false,
  title,
  badge,
  required = false
}) => {
  // 1. All Provinces (7)
  const provinces = useMemo(() => getProvinces(), []);

  const selectedProvinceName = value?.provinceName || '';

  // 2. Dependent Districts: ONLY districts in selected province
  const districts = useMemo(() => {
    if (!selectedProvinceName) return [];
    return getDistrictsByProvince(selectedProvinceName);
  }, [selectedProvinceName]);

  const selectedDistrictName = value?.districtName || '';

  // 3. Dependent Local Levels: ONLY local levels in selected district
  const localLevels = useMemo(() => {
    if (!selectedProvinceName || !selectedDistrictName) return [];
    return getLocalLevelsByDistrict(selectedProvinceName, selectedDistrictName);
  }, [selectedProvinceName, selectedDistrictName]);

  // Selected Local Level object
  const selectedLocalLevel = useMemo(() => {
    if (!value?.municipalityName || localLevels.length === 0) return null;
    const raw = String(value.municipalityName).trim().toLowerCase();
    return (
      localLevels.find(
        (ll: any) =>
          ll.name.toLowerCase() === raw ||
          ll.fullTitle.toLowerCase() === raw ||
          String(ll.sn) === raw
      ) || null
    );
  }, [value?.municipalityName, localLevels]);

  // 4. Dependent Wards: ONLY wards belonging to selected municipality
  const wards = useMemo(() => {
    if (!selectedLocalLevel || !selectedLocalLevel.totalWards) return [];
    return Array.from({ length: selectedLocalLevel.totalWards }, (_, i) => i + 1);
  }, [selectedLocalLevel]);

  // Emit changes to parent
  const emitChange = (next: NepalLocation) => {
    const composed = formatFullNepalAddress(next, lang);
    onChange(next, composed);
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provName = e.target.value;
    emitChange({
      provinceName: provName,
      districtName: '',
      municipalityName: '',
      ward: '',
      tole: value?.tole || ''
    });
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const distName = e.target.value;
    emitChange({
      ...value,
      districtName: distName,
      municipalityName: '',
      ward: ''
    });
  };

  const handleMunicipalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetTitle = e.target.value;
    const target = localLevels.find((ll: any) => ll.fullTitle === targetTitle || ll.name === targetTitle);
    emitChange({
      ...value,
      municipalityName: target ? target.fullTitle : targetTitle,
      ward: ''
    });
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    emitChange({
      ...value,
      ward: e.target.value
    });
  };

  const handleToleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    emitChange({
      ...value,
      tole: e.target.value
    });
  };

  const selectBaseClass = 'w-full px-2.5 py-1.5 text-xs border rounded-lg outline-none font-medium transition';
  const activeClass = 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 shadow-2xs';
  const disabledClass = 'border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 cursor-not-allowed';

  return (
    <div className={`p-3 rounded-xl border transition-all ${
      disabled
        ? 'bg-slate-50/60 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 opacity-80'
        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-2xs'
    }`}>
      {/* Header / Title if provided */}
      {title && (
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
              {title}
            </span>
            {required && <span className="text-rose-500 font-black">*</span>}
          </div>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {badge}
            </span>
          )}
        </div>
      )}

      {/* 4-Step Dependent Hierarchy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
        {/* 1. Province Dropdown */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            {lang === 'en' ? 'Province' : 'प्रदेश'}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
          <select
            value={selectedProvinceName}
            onChange={handleProvinceChange}
            disabled={disabled}
            className={`${selectBaseClass} ${disabled ? disabledClass : activeClass}`}
          >
            <option value="">
              {lang === 'en' ? '-- Select Province --' : '-- प्रदेश छान्नुहोस् --'}
            </option>
            {provinces.map((p: any) => (
              <option key={p.name} value={p.name}>
                {lang === 'np' ? `${p.nameNp} (${p.name})` : `${p.name} (${p.nameNp})`}
              </option>
            ))}
          </select>
        </div>

        {/* 2. District Dropdown (Dependent on Province) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            {lang === 'en' ? 'District' : 'जिल्ला'}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
          <select
            value={selectedDistrictName}
            onChange={handleDistrictChange}
            disabled={disabled || !selectedProvinceName}
            className={`${selectBaseClass} ${disabled || !selectedProvinceName ? disabledClass : activeClass}`}
          >
            <option value="">
              {!selectedProvinceName
                ? (lang === 'en' ? '-- Select Province 1st --' : '-- पहिले प्रदेश छान्नुहोस् --')
                : (lang === 'en' ? '-- Select District --' : '-- जिल्ला छान्नुहोस् --')}
            </option>
            {districts.map((d: any) => (
              <option key={d.name} value={d.name}>
                {lang === 'np' ? `${d.nameNp} (${d.name})` : `${d.name} (${d.nameNp})`}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Municipality / Local Level (Dependent on District) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
              {lang === 'en' ? 'Local Level' : 'स्थानीय तह'}
              {required && <span className="text-rose-500 ml-0.5">*</span>}
            </label>
            {selectedLocalLevel && (
              <span className="text-[9.5px] font-extrabold px-1 rounded bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                {selectedLocalLevel.totalWards}W
              </span>
            )}
          </div>
          <select
            value={selectedLocalLevel ? selectedLocalLevel.fullTitle : (value?.municipalityName || '')}
            onChange={handleMunicipalityChange}
            disabled={disabled || !selectedDistrictName}
            className={`${selectBaseClass} ${disabled || !selectedDistrictName ? disabledClass : activeClass}`}
          >
            <option value="">
              {!selectedDistrictName
                ? (lang === 'en' ? '-- Select District 1st --' : '-- पहिले जिल्ला छान्नुहोस् --')
                : (lang === 'en' ? '-- Select Municipality --' : '-- नगरपालिका / गाउँपालिका --')}
            </option>
            {localLevels.map((ll: any) => (
              <option key={ll.sn} value={ll.fullTitle}>
                {lang === 'np' ? `${ll.fullTitleNp || ll.fullTitle}` : `${ll.fullTitle}`}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Ward Number (Dependent on Municipality) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            {lang === 'en' ? 'Ward No' : 'वडा नं.'}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
          <select
            value={value?.ward || ''}
            onChange={handleWardChange}
            disabled={disabled || !selectedLocalLevel}
            className={`${selectBaseClass} ${disabled || !selectedLocalLevel ? disabledClass : activeClass}`}
          >
            <option value="">
              {!selectedLocalLevel
                ? (lang === 'en' ? '-- Municipality 1st --' : '-- पहिले तह छान्नुहोस् --')
                : (lang === 'en' ? '-- Select Ward --' : '-- वडा छान्नुहोस् --')}
            </option>
            {wards.map((w: number) => (
              <option key={w} value={String(w)}>
                {lang === 'np' ? `वडा नं. ${w}` : `Ward ${w}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Street / Tole / Area Input */}
      <div className="mt-2.5">
        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
          {lang === 'en' ? 'Street / Tole / Landmark' : 'टोल / मार्ग / मुख्य चोक'}
        </label>
        <input
          type="text"
          value={value?.tole || ''}
          onChange={handleToleChange}
          disabled={disabled}
          placeholder={lang === 'en' ? 'e.g. Koteshwor Chowk, Ward Office Road' : 'जस्तै: कोटेश्वर चोक, वडा कार्यालय मार्ग'}
          className={`w-full px-2.5 py-1.5 text-xs border rounded-lg outline-none font-medium transition ${
            disabled ? disabledClass : activeClass
          }`}
        />
      </div>

      {/* Live Composed Address Preview Pill */}
      {(selectedProvinceName || selectedDistrictName || value?.municipalityName || value?.ward || value?.tole) && (
        <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-800/60 text-orange-900 dark:text-orange-200 text-[11px]">
          <span className="shrink-0 font-bold">📍</span>
          <span className="font-semibold truncate">
            {formatFullNepalAddress(value, lang) || '—'}
          </span>
        </div>
      )}
    </div>
  );
};

export default NepalAddressFields;
