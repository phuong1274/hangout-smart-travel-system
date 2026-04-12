import React, { useState } from 'react';
import { Card, Typography, Switch, Button, Space, message, Popconfirm, Input, Tooltip } from 'antd';
import { CopyOutlined, ReloadOutlined, LinkOutlined } from '@ant-design/icons';
import { updateJoinCodeApi } from '../api';

const { Text, Title } = Typography;

const JoinCodeSettings = ({ tripId, joinCode, isJoinCodeActive, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [activeState, setActiveState] = useState(isJoinCodeActive);
  const [currentCode, setCurrentCode] = useState(joinCode);

  const handleToggleActive = async (checked) => {
    setLoading(true);
    try {
      const result = await updateJoinCodeApi(tripId, { isActive: checked, regenerate: false });
      setActiveState(result.isJoinCodeActive);
      setCurrentCode(result.joinCode);
      message.success(checked ? 'Join code activated.' : 'Join code deactivated.');
      onUpdate?.(result);
    } catch (err) {
      message.error('Failed to update join code settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const result = await updateJoinCodeApi(tripId, { isActive: activeState, regenerate: true });
      setActiveState(result.isJoinCodeActive);
      setCurrentCode(result.joinCode);
      message.success('Join code regenerated!');
      onUpdate?.(result);
    } catch (err) {
      message.error('Failed to regenerate join code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (currentCode) {
      navigator.clipboard.writeText(currentCode);
      message.success('Join code copied to clipboard!');
    }
  };

  return (
    <Card
      size="small"
      title={<Space><LinkOutlined /> Join Code Settings</Space>}
      style={{ marginBottom: 16 }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
          <Text>Active:</Text>
          <Switch
            checked={activeState}
            onChange={handleToggleActive}
            loading={loading}
          />
        </Space>

        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={currentCode || 'No code generated'}
            readOnly
            size="large"
            style={{
              textAlign: 'center',
              letterSpacing: 3,
              fontWeight: 700,
              fontFamily: 'monospace',
              fontSize: 18,
            }}
          />
          <Tooltip title="Copy to clipboard">
            <Button size="large" icon={<CopyOutlined />} onClick={handleCopy} disabled={!currentCode} />
          </Tooltip>
        </Space.Compact>

        <Popconfirm
          title="Regenerate Join Code?"
          description="The old code will no longer work. Are you sure?"
          onConfirm={handleRegenerate}
          okText="Yes, Regenerate"
          cancelText="Cancel"
        >
          <Button icon={<ReloadOutlined />} loading={loading} block>
            Regenerate Code
          </Button>
        </Popconfirm>
      </Space>
    </Card>
  );
};

export default JoinCodeSettings;
