import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

export default function FlameTimeline({ data = [], height = 180 }) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-slate-500 text-sm bg-slate-900/40 rounded-lg border border-slate-800"
        style={{ height }}
      >
        Waiting for incoming flame detector telemetry...
      </div>
    );
  }

  const chartData = data.map((d, index) => {
    const timeStr = d.receivedAt
      ? new Date(d.receivedAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : `#${d.sequence || index}`;

    return {
      time: timeStr,
      detected: d.flameDetected ? 1 : 0,
      label: d.flameDetected ? 'FLAME' : 'SAFE',
    };
  });

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 20, left: -25, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="time"
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 11 }}
            domain={[0, 1]}
            ticks={[0, 1]}
            tickFormatter={(v) => (v === 1 ? 'FLAME' : 'CLEAR')}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '0.5rem',
              color: '#f8fafc',
              fontSize: '12px',
            }}
            formatter={(value) => [
              value === 1 ? '⚠️ FLAME DETECTED' : '✓ CLEAR (No flame)',
              'Sensor State',
            ]}
            labelFormatter={(label) => `Time: ${label}`}
          />
          <Bar dataKey="detected" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.detected === 1 ? '#ef4444' : '#1e293b'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

