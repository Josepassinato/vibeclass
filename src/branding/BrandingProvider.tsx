import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_WHITE_LABEL_CONFIG, PRESET_BY_ID, SCHOOL_PRESETS, VIBE_CODE_CONFIG } from './presets';
import { IS_WHITE_LABEL_PRODUCT, PRODUCT_MODE, type ProductMode } from './product';
import type { SchoolPresetId, WhiteLabelConfig } from './types';

const STORAGE_KEY = 'adaptive-school-white-label-v1';

interface BrandingContextValue {
  productMode: ProductMode;
  isWhiteLabelProduct: boolean;
  config: WhiteLabelConfig;
  presets: typeof SCHOOL_PRESETS;
  setConfig: (updater: (prev: WhiteLabelConfig) => WhiteLabelConfig) => void;
  patchConfig: (patch: Partial<WhiteLabelConfig>) => void;
  patchTerminology: (patch: Partial<WhiteLabelConfig['terminology']>) => void;
  applyPreset: (presetId: SchoolPresetId) => void;
  resetBranding: () => void;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

function loadStoredConfig(): WhiteLabelConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WHITE_LABEL_CONFIG;
    const parsed = JSON.parse(raw) as WhiteLabelConfig;
    return {
      ...DEFAULT_WHITE_LABEL_CONFIG,
      ...parsed,
      terminology: {
        ...DEFAULT_WHITE_LABEL_CONFIG.terminology,
        ...parsed.terminology,
      },
      accentPalette: parsed.accentPalette ?? DEFAULT_WHITE_LABEL_CONFIG.accentPalette,
    };
  } catch {
    return DEFAULT_WHITE_LABEL_CONFIG;
  }
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<WhiteLabelConfig>(() =>
    IS_WHITE_LABEL_PRODUCT ? loadStoredConfig() : VIBE_CODE_CONFIG,
  );

  const setConfig = useCallback((updater: (prev: WhiteLabelConfig) => WhiteLabelConfig) => {
    if (!IS_WHITE_LABEL_PRODUCT) return;
    setConfigState(updater);
  }, []);

  useEffect(() => {
    if (!IS_WHITE_LABEL_PRODUCT) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    const [c1, c2, c3, c4] = config.accentPalette;
    const root = document.documentElement;
    root.style.setProperty('--brand-accent-1', c1);
    root.style.setProperty('--brand-accent-2', c2);
    root.style.setProperty('--brand-accent-3', c3);
    root.style.setProperty('--brand-accent-4', c4);
  }, [config.accentPalette]);

  useEffect(() => {
    document.title = config.brandName;
  }, [config.brandName]);

  const patchConfig = useCallback((patch: Partial<WhiteLabelConfig>) => {
    if (!IS_WHITE_LABEL_PRODUCT) return;
    setConfigState((prev) => ({ ...prev, ...patch }));
  }, []);

  const patchTerminology = useCallback((patch: Partial<WhiteLabelConfig['terminology']>) => {
    if (!IS_WHITE_LABEL_PRODUCT) return;
    setConfigState((prev) => ({
      ...prev,
      terminology: {
        ...prev.terminology,
        ...patch,
      },
    }));
  }, []);

  const applyPreset = useCallback((presetId: SchoolPresetId) => {
    if (!IS_WHITE_LABEL_PRODUCT) return;
    const preset = PRESET_BY_ID[presetId];
    if (!preset) return;
    setConfigState({
      ...preset.config,
      presetId,
    });
  }, []);

  const resetBranding = useCallback(() => {
    if (!IS_WHITE_LABEL_PRODUCT) return;
    setConfigState(DEFAULT_WHITE_LABEL_CONFIG);
  }, []);

  const value = useMemo<BrandingContextValue>(
    () => ({
      productMode: PRODUCT_MODE,
      isWhiteLabelProduct: IS_WHITE_LABEL_PRODUCT,
      config,
      presets: SCHOOL_PRESETS,
      setConfig,
      patchConfig,
      patchTerminology,
      applyPreset,
      resetBranding,
    }),
    [config, patchConfig, patchTerminology, applyPreset, resetBranding],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used inside BrandingProvider');
  }

  const { config } = context;
  return {
    ...context,
    labels: {
      learnerSingular: config.terminology.learnerSingular,
      learnerPlural: config.terminology.learnerPlural,
      learnerSingularTitle: capitalize(config.terminology.learnerSingular),
      learnerPluralTitle: capitalize(config.terminology.learnerPlural),
      lessonSingular: config.terminology.lessonSingular,
      lessonPlural: config.terminology.lessonPlural,
      lessonSingularTitle: capitalize(config.terminology.lessonSingular),
      lessonPluralTitle: capitalize(config.terminology.lessonPlural),
      moduleSingular: config.terminology.moduleSingular,
      modulePlural: config.terminology.modulePlural,
      missionSingular: config.terminology.missionSingular,
      missionPlural: config.terminology.missionPlural,
    },
  };
}
