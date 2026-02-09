import { Dropdown } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const languages = [
  { key: 'en', label: 'English' },
  { key: 'vi', label: 'Tiếng Việt' },
];

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  return (
    <Dropdown
      menu={{
        items: languages.map((lang) => ({
          key: lang.key,
          label: lang.label,
          disabled: i18n.language === lang.key,
        })),
        onClick: ({ key }) => i18n.changeLanguage(key),
      }}
    >
      <GlobalOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
    </Dropdown>
  );
};
