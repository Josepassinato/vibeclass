export type ProductMode = 'vibe-code' | 'white-label';

function resolveProductMode(): ProductMode {
  const rawMode = import.meta.env.VITE_PRODUCT_MODE?.toLowerCase();
  if (rawMode === 'white-label') {
    return 'white-label';
  }
  return 'vibe-code';
}

export const PRODUCT_MODE: ProductMode = resolveProductMode();
export const IS_WHITE_LABEL_PRODUCT = PRODUCT_MODE === 'white-label';
