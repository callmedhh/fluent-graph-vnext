import React, { CSSProperties } from "react";

export type ILinkType =
  | "none"
  | "hidden"
  | "dotted"
  | "dashed"
  | "solid"
  | "double"
  | "groove"
  | "ridge"
  | "inset"
  | "outset";

export interface ILinkProps extends ILinkCommonConfig {
  id: string;
  start: ILinkEnd;
  end: ILinkEnd;
  lineAriaLabel?: string;
}

export interface ILinkCommonConfig extends ILinkEventHandlers {
  size?: number;
  color?: string;
  lineType?: ILinkType;
  style?: CSSProperties;
  className?: string;
  lineStyle?: CSSProperties;
  focusable?: boolean;
}

export interface ILinkEventHandlers {
  onClickLink?: (
    event: React.MouseEvent<HTMLElement, MouseEvent>,
    props: ILinkProps
  ) => void;
  onMouseOverLink?: (
    event: React.MouseEvent<HTMLElement, MouseEvent>,
    props: ILinkProps
  ) => void;
  onMouseOutLink?: (
    event: React.MouseEvent<HTMLElement, MouseEvent>,
    props: ILinkProps
  ) => void;
  onKeyDownLink?: (
    event: React.KeyboardEvent<HTMLElement>,
    props: ILinkProps
  ) => void;
}

export interface ILinkEnd {
  x: number;
  y: number;
  offset?: number;
}
