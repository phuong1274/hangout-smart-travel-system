import { Dropdown } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { useCurrencyStore, CURRENCIES } from '@/stores/currency.store';
import type { CurrencyCode } from '@/stores/currency.store';

export const CurrencySwitcher = () => {
  const { currency, setCurrency } = useCurrencyStore();

  const items = (Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => ({
    key: code,
    label: `${CURRENCIES[code].symbol} ${code}`,
    disabled: currency === code,
  }));

  return (
    <Dropdown
      menu={{
        items,
        onClick: ({ key }) => setCurrency(key as CurrencyCode),
      }}
    >
      <span style={{ cursor: 'pointer', fontSize: 14 }}>
        <DollarOutlined style={{ marginRight: 4 }} />
        {currency}
      </span>
    </Dropdown>
  );
};
