import React, { useMemo, useState } from 'react';
import { Card, Empty, Space, Typography } from 'antd';

const { Text, Title } = Typography;

const CHART = {
  width: 360,
  height: 220,
  left: 44,
  right: 18,
  top: 16,
  bottom: 38,
};

const formatTick = (value) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }

  return String(value);
};

const TrendPanel = ({ title, points = [] }) => {
  const [activeIndex, setActiveIndex] = useState(points.length > 0 ? points.length - 1 : null);

  const chart = useMemo(() => {
    if (!Array.isArray(points) || points.length === 0) {
      return null;
    }

    const plotWidth = CHART.width - CHART.left - CHART.right;
    const plotHeight = CHART.height - CHART.top - CHART.bottom;
    const values = points.map((item) => Number(item?.value || 0));
    const maxValue = Math.max(...values, 1);
    const safeMax = maxValue <= 3 ? maxValue : Math.ceil(maxValue / 5) * 5;
    const ticks = [safeMax, Math.round(safeMax / 2), 0];

    const dots = points.map((item, index) => {
      const x = CHART.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
      const y = CHART.top + plotHeight - (Number(item?.value || 0) / safeMax) * plotHeight;
      return {
        index,
        label: item?.label || '-',
        value: Number(item?.value || 0),
        x,
        y,
      };
    });

    return {
      dots,
      line: dots.map((dot) => `${dot.x},${dot.y}`).join(' '),
      ticks,
      plotHeight,
      plotWidth,
      safeMax,
    };
  }, [points]);

  const activePoint = chart && activeIndex !== null ? chart.dots[activeIndex] : null;

  return (
    <Card
      bodyStyle={{ padding: 20 }}
      style={{ borderRadius: 20, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Text type="secondary">Last 6 months</Text>
          <Title level={4} style={{ margin: 0 }}>{title}</Title>
        </div>

        {chart ? (
          <div style={{ position: 'relative' }}>
            {activePoint ? (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: '#0f172a',
                  color: '#fff',
                  borderRadius: 12,
                  padding: '8px 12px',
                  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.2)',
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.75 }}>{activePoint.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{activePoint.value}</div>
              </div>
            ) : null}

            <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} style={{ width: '100%', height: 220 }}>
              {chart.ticks.map((tick) => {
                const y = CHART.top + chart.plotHeight - (tick / chart.safeMax) * chart.plotHeight;
                return (
                  <g key={tick}>
                    <line
                      x1={CHART.left}
                      y1={y}
                      x2={CHART.width - CHART.right}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeDasharray="4 4"
                    />
                    <text x={CHART.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#64748b">
                      {formatTick(tick)}
                    </text>
                  </g>
                );
              })}

              <line
                x1={CHART.left}
                y1={CHART.height - CHART.bottom}
                x2={CHART.width - CHART.right}
                y2={CHART.height - CHART.bottom}
                stroke="#cbd5e1"
              />

              <polyline
                fill="none"
                stroke="#1677ff"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={chart.line}
              />

              {chart.dots.map((dot) => (
                <g
                  key={dot.index}
                  onMouseEnter={() => setActiveIndex(dot.index)}
                  onMouseLeave={() => setActiveIndex(chart.dots.length - 1)}
                  style={{ cursor: 'pointer' }}
                >
                  <line
                    x1={dot.x}
                    y1={CHART.top}
                    x2={dot.x}
                    y2={CHART.height - CHART.bottom}
                    stroke={activePoint?.index === dot.index ? '#bfdbfe' : 'transparent'}
                  />
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    r={activePoint?.index === dot.index ? 5 : 4}
                    fill="#ffffff"
                    stroke="#1677ff"
                    strokeWidth="3"
                  />
                  <text
                    x={dot.x}
                    y={CHART.height - CHART.bottom + 20}
                    textAnchor="middle"
                    fontSize="11"
                    fill={activePoint?.index === dot.index ? '#0f172a' : '#64748b'}
                  >
                    {dot.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data" />
        )}
      </Space>
    </Card>
  );
};

export default TrendPanel;
