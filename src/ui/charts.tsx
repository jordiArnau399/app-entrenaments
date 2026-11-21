import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { colors, font } from './theme';
import { Empty, T } from './ui';

function formatTick(value: number): string {
  if (Math.abs(value) >= 100) return String(Math.round(value));
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function LineChart({
  points,
  color,
  empty,
}: {
  points: { label: string; value: number }[];
  color: string;
  empty: string;
}) {
  const [width, setWidth] = useState(560);
  if (points.length === 0) return <Empty>{empty}</Empty>;
  const height = 230;
  const padL = 46;
  const padR = 16;
  const padT = 16;
  const padB = 32;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const yMin = min === max ? min - 1 : min;
  const yMax = min === max ? max + 1 : max;
  const innerW = Math.max(width - padL - padR, 20);
  const innerH = height - padT - padB;
  const x = (index: number) => padL + (points.length === 1 ? innerW / 2 : (innerW * index) / (points.length - 1));
  const y = (value: number) => padT + ((yMax - value) / (yMax - yMin || 1)) * innerH;
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(point.value).toFixed(1)}`).join(' ');
  const ticks = [yMax, (yMax + yMin) / 2, yMin];
  return (
    <View onLayout={(event) => setWidth(Math.max(280, event.nativeEvent.layout.width))}>
      <Svg width={width} height={height}>
        {ticks.map((tick) => (
          <SvgText key={tick} x={4} y={y(tick) + 4} fill={colors.muted} fontSize="11" fontFamily={font.body}>
            {formatTick(tick)}
          </SvgText>
        ))}
        {ticks.map((tick) => (
          <Line key={`g${tick}`} x1={padL} x2={width - padR} y1={y(tick)} y2={y(tick)} stroke={colors.line} strokeWidth={1} />
        ))}
        <Path d={path} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point, index) => (
          <Circle key={`${point.label}-${index}`} cx={x(index)} cy={y(point.value)} r={4.5} fill={colors.surface} stroke={color} strokeWidth={2.5} />
        ))}
        {points.map((point, index) =>
          index === 0 || index === points.length - 1 || points.length <= 8 ? (
            <SvgText key={`l${index}`} x={x(index)} y={height - 8} fill={colors.muted} fontSize="11" fontFamily={font.body} textAnchor="middle">
              {point.label}
            </SvgText>
          ) : null,
        )}
      </Svg>
    </View>
  );
}

export function BarChart({
  points,
  empty,
}: {
  points: { label: string; value: number }[];
  empty: string;
}) {
  const [width, setWidth] = useState(560);
  if (points.length === 0) return <Empty>{empty}</Empty>;
  const height = 230;
  const padL = 36;
  const padB = 32;
  const padT = 12;
  const innerW = Math.max(width - padL - 8, 20);
  const innerH = height - padT - padB;
  const slot = innerW / points.length;
  const barW = Math.min(36, slot * 0.55);
  return (
    <View onLayout={(event) => setWidth(Math.max(280, event.nativeEvent.layout.width))}>
      <Svg width={width} height={height}>
        {[0, 50, 100].map((tick) => (
          <Line
            key={tick}
            x1={padL}
            x2={width - 8}
            y1={padT + ((100 - tick) / 100) * innerH}
            y2={padT + ((100 - tick) / 100) * innerH}
            stroke={colors.line}
            strokeWidth={1}
          />
        ))}
        {[0, 50, 100].map((tick) => (
          <SvgText key={`t${tick}`} x={0} y={padT + ((100 - tick) / 100) * innerH + 4} fill={colors.muted} fontSize="11" fontFamily={font.body}>
            {tick}
          </SvgText>
        ))}
        {points.map((point, index) => {
          const h = (Math.max(0, Math.min(100, point.value)) / 100) * innerH;
          const x = padL + index * slot + (slot - barW) / 2;
          const y = padT + innerH - h;
          return (
            <Rect key={point.label} x={x} y={y} width={barW} height={Math.max(h, 2)} rx={6} fill={point.value >= 70 ? colors.good : colors.accent} />
          );
        })}
        {points.map((point, index) => (
          <SvgText
            key={`l${point.label}`}
            x={padL + index * slot + slot / 2}
            y={height - 8}
            fill={colors.muted}
            fontSize="11"
            fontFamily={font.body}
            textAnchor="middle"
          >
            {point.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

export function ChartCard({ title, detail, children }: { title: string; detail?: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 }}>
      <T variant="section">{title}</T>
      {detail ? <T variant="small">{detail}</T> : null}
      {children}
    </View>
  );
}
