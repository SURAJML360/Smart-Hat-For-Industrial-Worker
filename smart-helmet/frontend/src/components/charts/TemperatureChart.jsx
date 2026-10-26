import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

export default function TemperatureChart({
  data = [],
  warningThreshold = 45,
  criticalThreshold = 60,
  height = 280,
}) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-slate-500 text-sm bg-slate-900/40 rounded-lg border border-slate-800"
        style={{ height }}
      >
        Waiting for incoming temperature telemetry...
      </div>
    );
  }

  // Format data for Recharts
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
      temp: typeof d.temperatureC === 'number' ? d.temperatureC : null,
      raw: d.temperatureRaw,
    };
  });

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
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
            tickLine={false}
            unit="°C"
            domain={[0, (dataMax) => Math.max(Math.ceil(dataMax + 10), criticalThreshold + 10)]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '0.5rem',
              color: '#f8fafc',
              fontSize: '12px',
            }}
            formatter={(value) => [`${value} °C`, 'Temperature']}
            labelFormatter={(label) => `Time: ${label}`}
          />
          {warningThreshold && (
            <ReferenceLine
              y={warningThreshold}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{
                value: `Warn (${warningThreshold}°C)`,
                fill: '#f59e0b',
                fontSize: 10,
                position: 'top',
              }}
            />
          )}
          {criticalThreshold && (
            <ReferenceLine
              y={criticalThreshold}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{
                value: `Crit (${criticalThreshold}°C)`,
                fill: '#ef4444',
                fontSize: 10,
                position: 'top',
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="temp"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#tempGradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

