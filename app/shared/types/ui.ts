import React from "react";
import { ProcessingStatus } from "./common";

// Theme and styling types
export type ThemeMode = "light" | "dark" | "system";

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  destructive: string;
  muted: string;
  background: string;
  foreground: string;
  card: string;
  border: string;
  input: string;
  ring: string;
}

export interface ThemeConfig {
  mode: ThemeMode;
  colors: ThemeColors;
  borderRadius: number;
  fontFamily: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    "2xl": string;
    "3xl": string;
    "4xl": string;
  };
  spacing: Record<string, string>;
  animation: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      ease: string;
      easeIn: string;
      easeOut: string;
      easeInOut: string;
    };
  };
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  id?: string;
  children?: React.ReactNode;
  "data-testid"?: string;
}

export interface InteractiveComponentProps extends BaseComponentProps {
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  onFocus?: (event: React.FocusEvent) => void;
  onBlur?: (event: React.FocusEvent) => void;
}

// Button variants and sizes
export type ButtonVariant = 
  | "default" 
  | "destructive" 
  | "outline" 
  | "secondary" 
  | "ghost" 
  | "link";

export type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends InteractiveComponentProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  type?: "button" | "submit" | "reset";
  form?: string;
  autoFocus?: boolean;
}

// Input variants and types
export type InputVariant = "default" | "outline" | "filled" | "underlined";
export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends BaseComponentProps {
  type?: "text" | "email" | "password" | "number" | "url" | "tel" | "search";
  variant?: InputVariant;
  size?: InputSize;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onInput?: (event: React.FormEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  helper?: string;
  label?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  prefix?: React.ReactNode;
}

// Modal and dialog types
export interface ModalProps extends BaseComponentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  preventBodyScroll?: boolean;
  returnFocusOnClose?: boolean;
  initialFocus?: React.RefObject<HTMLElement>;
  onClose?: () => void;
  onAfterOpen?: () => void;
  onAfterClose?: () => void;
}

export interface DialogProps extends ModalProps {
  trigger?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  actions?: DialogAction[];
}

export interface DialogAction {
  label: string;
  variant?: ButtonVariant;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  autoFocus?: boolean;
}

// Loading and progress types
export interface LoadingSpinnerProps extends BaseComponentProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "default" | "primary" | "secondary" | "muted";
  text?: string;
  overlay?: boolean;
}

export interface ProgressBarProps extends BaseComponentProps {
  value: number; // 0-100
  max?: number;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "error";
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  indeterminate?: boolean;
}

export interface SkeletonProps extends BaseComponentProps {
  width?: string | number;
  height?: string | number;
  variant?: "text" | "rectangular" | "circular";
  animation?: "pulse" | "wave" | "none";
  count?: number;
}

// Status and notification types
export type NotificationType = "success" | "error" | "warning" | "info";
export type NotificationPosition = 
  | "top-left" 
  | "top-center" 
  | "top-right" 
  | "bottom-left" 
  | "bottom-center" 
  | "bottom-right";

export interface NotificationProps {
  id?: string;
  type: NotificationType;
  title: string;
  description?: string;
  duration?: number;
  position?: NotificationPosition;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

export interface ToastProps extends NotificationProps {
  promise?: Promise<any>;
  loading?: string;
  success?: string | ((data: any) => string);
  error?: string | ((error: any) => string);
}

export interface StatusBadgeProps extends BaseComponentProps {
  status: ProcessingStatus | "success" | "warning" | "info";
  text?: string;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "default" | "outline" | "solid";
  showIcon?: boolean;
  pulse?: boolean;
}

// Navigation and menu types
export interface NavigationItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
  children?: NavigationItem[];
  onClick?: () => void;
}

export interface MenuProps extends BaseComponentProps {
  items: NavigationItem[];
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "pills" | "underline";
  size?: "sm" | "md" | "lg";
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export interface DropdownMenuProps extends BaseComponentProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
  offset?: number;
  disabled?: boolean;
  modal?: boolean;
}

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  destructive?: boolean;
  separator?: boolean;
  children?: DropdownMenuItem[];
  onClick?: () => void;
}

// Form and validation types
export interface FormFieldProps<T = any> extends BaseComponentProps {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  value?: T;
  defaultValue?: T;
  error?: string;
  onChange?: (value: T) => void;
  onBlur?: () => void;
  validate?: (value: T) => string | undefined;
}

export interface FormProps extends BaseComponentProps {
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
  schema?: any; // Zod schema or similar
  defaultValues?: Record<string, any>;
  mode?: "onChange" | "onBlur" | "onSubmit";
  resetOnSubmit?: boolean;
  disabled?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormState {
  values: Record<string, any>;
  errors: ValidationError[];
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
}

// Table and data display types
export interface TableColumn<T = any> {
  id: string;
  header: string;
  accessor?: keyof T | ((row: T) => any);
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  cell?: (value: any, row: T) => React.ReactNode;
  headerCell?: () => React.ReactNode;
  footerCell?: () => React.ReactNode;
}

export interface TableProps<T = any> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string, order: "asc" | "desc") => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  selection?: {
    selectedRows: string[];
    onSelectionChange: (selectedRows: string[]) => void;
    rowId: keyof T;
  };
  expansion?: {
    expandedRows: string[];
    onExpansionChange: (expandedRows: string[]) => void;
    renderExpanded: (row: T) => React.ReactNode;
  };
}

// Layout and responsive types
export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface ResponsiveValue<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  "2xl"?: T;
}

export interface GridProps extends BaseComponentProps {
  columns?: number | ResponsiveValue<number>;
  gap?: string | number | ResponsiveValue<string | number>;
  alignItems?: "start" | "center" | "end" | "stretch";
  justifyContent?: "start" | "center" | "end" | "between" | "around" | "evenly";
  autoFlow?: "row" | "column" | "dense";
}

export interface FlexProps extends BaseComponentProps {
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  wrap?: "nowrap" | "wrap" | "wrap-reverse";
  alignItems?: "start" | "center" | "end" | "stretch" | "baseline";
  justifyContent?: "start" | "center" | "end" | "between" | "around" | "evenly";
  gap?: string | number;
}

export interface StackProps extends BaseComponentProps {
  direction?: "horizontal" | "vertical";
  spacing?: string | number | ResponsiveValue<string | number>;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  wrap?: boolean;
  divider?: React.ReactNode;
}

// Virtualization and performance types
export interface VirtualizedListProps<T = any> extends BaseComponentProps {
  items: T[];
  itemHeight: number | ((index: number) => number);
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
  estimatedItemHeight?: number;
  scrollToIndex?: number;
  scrollToAlignment?: "start" | "center" | "end" | "auto";
}

export interface InfiniteScrollProps<T = any> extends BaseComponentProps {
  items: T[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  threshold?: number;
  loader?: React.ReactNode;
  endMessage?: React.ReactNode;
  error?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
}

// Animation and transition types
export interface AnimationProps {
  initial?: any;
  animate?: any;
  exit?: any;
  transition?: any;
  variants?: any;
  custom?: any;
}

export interface TransitionProps {
  show: boolean;
  appear?: boolean;
  enter?: string;
  enterFrom?: string;
  enterTo?: string;
  leave?: string;
  leaveFrom?: string;
  leaveTo?: string;
  children: React.ReactNode;
}

// Accessibility types
export interface A11yProps {
  role?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-expanded"?: boolean;
  "aria-selected"?: boolean;
  "aria-checked"?: boolean;
  "aria-disabled"?: boolean;
  "aria-hidden"?: boolean;
  "aria-live"?: "off" | "polite" | "assertive";
  "aria-atomic"?: boolean;
  "aria-busy"?: boolean;
  "aria-controls"?: string;
  "aria-current"?: boolean | "page" | "step" | "location" | "date" | "time";
  "aria-owns"?: string;
  "aria-posinset"?: number;
  "aria-setsize"?: number;
  tabIndex?: number;
}

export default {};