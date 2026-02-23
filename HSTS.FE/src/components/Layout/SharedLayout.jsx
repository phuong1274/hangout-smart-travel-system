import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';

const { Header, Content } = Layout;

export default function SharedLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ color: '#fff' }}>HSTS.FE</Header>
      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>
    </Layout>
  );
}