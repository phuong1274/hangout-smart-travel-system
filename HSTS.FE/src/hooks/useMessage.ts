import { App } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';

/**
 * Hook to use Ant Design message API with dynamic theme support.
 * This replaces the static message.success/error methods to avoid
 * the "Static function can not consume context" warning.
 *
 * @example
 * ```tsx
 * const { messageApi } = useMessage();
 * messageApi.success('Operation successful');
 * ```
 */
export const useMessage = (): MessageInstance => {
  const { message } = App.useApp();
  return message;
};
