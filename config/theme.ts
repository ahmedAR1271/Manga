/**
 * Theme configuration — PLACEHOLDER ONLY.
 *
 * Phase 1 intentionally ships no styling system. This file reserves the
 * shape that the Phase 2 design system will fill in (color tokens,
 * typography scale, spacing, radii, etc.). Components must not depend on
 * these values yet.
 */

export interface ThemeConfig {
  colors: Record<string, string>;
  fonts: Record<string, string>;
  radii: Record<string, string>;
}

export const theme: ThemeConfig = {
  colors: {},
  fonts: {},
  radii: {},
};
