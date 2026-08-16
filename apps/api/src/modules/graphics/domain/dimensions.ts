import type { GraphicFormat } from '@prisma/client';

export interface Dimensions {
  width: number;
  height: number;
}

// Brief §4: "Consistent 1080×1080 and 1080×1350 outputs, plus 1080×1920 for
// status/stories."
export const FORMAT_DIMENSIONS: Record<GraphicFormat, Dimensions> = {
  SQUARE: { width: 1080, height: 1080 },
  PORTRAIT: { width: 1080, height: 1350 },
  STORY: { width: 1080, height: 1920 },
};
