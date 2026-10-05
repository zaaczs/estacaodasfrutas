"use client";

type ChartPoint = {
  label: string;
  value: number;
};

type SimpleLineChartProps = {
  data: ChartPoint[];
  colorClassName?: string;
};

export function SimpleLineChart({
  data,
  colorClassName = "stroke-primary",
}: SimpleLineChartProps) {
  const width = 720;
  const height = 260;
  const padding = 28;

  if (!data.length) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
        Sem dados no período selecionado.
      </div>
    );
  }

  const maxValue = Math.max(...data.map((point) => point.value), 1);
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0;

  const points = data.map((point, index) => {
    const x = padding + stepX * index;
    const y = padding + chartHeight - (point.value / maxValue) * chartHeight;
    return { ...point, x, y };
  });

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const tickStep = Math.max(1, Math.ceil(data.length / 8));
  const xTicks = points.filter((_, idx) => idx % tickStep === 0 || idx === points.length - 1);

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          className="stroke-border"
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          className="stroke-border"
        />

        <path d={path} fill="none" className={`${colorClassName} stroke-[2.5]`} />

        {points.map((point) => (
          <circle
            key={point.label}
            cx={point.x}
            cy={point.y}
            r="3"
            className="fill-primary"
          />
        ))}

        {xTicks.map((point) => (
          <text
            key={`tick-${point.label}`}
            x={point.x}
            y={height - 8}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
