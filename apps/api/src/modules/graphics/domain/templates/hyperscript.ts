// Minimal hyperscript builder for Satori's React-element-shaped node tree
// ({ type, props: { style, children } }) — deliberately not JSX/React: this
// keeps apps/api's tsconfig untouched and avoids adding a UI framework
// dependency to a NestJS service for the sake of ten small templates.
export interface SatoriNode {
  type: string;
  props: {
    style?: Record<string, string | number>;
    children?: SatoriChild;
    [key: string]: unknown;
  };
}

export type SatoriChild = string | SatoriNode | Array<string | SatoriNode>;

export function h(
  type: string,
  style: Record<string, string | number> = {},
  children?: SatoriChild,
  extraProps: Record<string, unknown> = {},
): SatoriNode {
  return {
    type,
    props: {
      style,
      ...(children === undefined ? {} : { children }),
      ...extraProps,
    },
  };
}
