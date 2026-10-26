import { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

export default function SensorHistoryChart({
  data = [],
  warningThreshold = 45,
  criticalThreshold = 60,
  height = 360,
}) {
  const [viewMode, setViewMode] = useState('both'); // 'both', 'temp', 'flame'

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-slate-500 text-sm bg-slate-900/40 rounded-lg border border-slate-800"
        style={{ height }}
      >
        No telemetry records available for the selected period.
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
      temp: typeof d.temperatureC === 'number' ? d.temperatureC : null,
      flame: d.flameDetected ? 1 : 0,
      rawAdc: d.temperatureRaw,
      source: d.source || 'hardware',
    };
  });

  return (
    <div className="space-y-3">
      {/* View controls */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">Total samples: {chartData.length}</span>
        <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
          <button
            onClick={() => setViewMode('both')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewMode === 'both' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            Combined
          </button>
          <button
            onClick={() => setViewMode('temp')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewMode === 'temp' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            Temperature
          </button>
          <button
            onClick={() => setViewMode('flame')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewMode === 'flame' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            Flame Events
          </button>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
            />

            {/* Left Y-axis: Temperature */}
            {(viewMode === 'both' || viewMode === 'temp') && (
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                unit="°C"
                domain={[0, (dataMax) => Math.max(Math.ceil(dataMax + 10), criticalThreshold + 10)]}
              />
            )}

            {/* Right Y-axis: Flame Status */}
            {(viewMode === 'both' || viewMode === 'flame') && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#ef4444"
                tick={{ fill: '#ef4444', fontSize: 11 }}
                domain={[0, 1]}
                ticks={[0, 1]}
                tickFormatter={(v) => (v === 1 ? 'FLAME' : 'OK')}
              />
            )}

            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.5rem',
                color: '#f8fafc',
                fontSize: '12px',
              }}
              formatter={(value, name) => {
                if (name === 'Temperature') return [`${value} °C`, name];
                if (name === 'Flame Detected') return [value === 1 ? 'YES (ALERT)' : 'No', name];
                return [value, name];
              }}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />

            {/* Threshold reference lines */}
            {(viewMode === 'both' || viewMode === 'temp') && (
              <>
                <ReferenceLine
                  yAxisId="left"
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
                <ReferenceLine
                  yAxisId="left"
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
              </>
            )}

            {/* Flame Bars */}
            {(viewMode === 'both' || viewMode === 'flame') && (
              <Bar
                yAxisId="right"
                dataKey="flame"
                name="Flame Detected"
                fill="#ef4444"
                opacity={0.7}
                barSize={8}
                isAnimationActive={false}
              />
            )}

            {/* Temperature Line */}
            {(viewMode === 'both' || viewMode === 'temp') && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="temp"
                name="Temperature"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

