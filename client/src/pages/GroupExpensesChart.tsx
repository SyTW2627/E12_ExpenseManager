import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface MemberPaid {
  id: string
  name: string
  paid: number
}

interface GroupExpensesChartProps {
  data: MemberPaid[]
  formatMoney: (value: number) => string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: { payload: MemberPaid }[]
  formatMoney: (value: number) => string
  total: number
}

const ROW_HEIGHT = 44

function ChartTooltip({ active, payload, formatMoney, total }: ChartTooltipProps) {
  const item = payload?.[0]?.payload
  if (!active || !item) return null
  const share = total > 0 ? Math.round((item.paid / total) * 100) : 0

  return (
    <div className="group-chart__tooltip">
      <p className="group-chart__tooltip-name">{item.name}</p>
      <p className="group-chart__tooltip-value">{formatMoney(item.paid)}</p>
      <p className="group-chart__tooltip-share">{share}% del total</p>
    </div>
  )
}

export default function GroupExpensesChart({ data, formatMoney }: GroupExpensesChartProps) {
  const total = data.reduce((acc, item) => acc + item.paid, 0)
  const height = data.length * ROW_HEIGHT + 16

  return (
    <figure className="group-chart">
      <figcaption className="group-chart__header">
        <h2>Pagado por cada miembro</h2>
        <p>Total que ha adelantado cada persona en los gastos del grupo.</p>
      </figcaption>

      <div className="group-chart__plot" aria-hidden="true">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 88, bottom: 8, left: 0 }}>
            <XAxis type="number" hide domain={[0, 'dataMax']} />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              axisLine={{ stroke: '#d6dae6' }}
              tickLine={false}
              tick={{ fill: '#4b5572', fontSize: 13 }}
            />
            <Tooltip
              cursor={{ fill: '#f4f5fa' }}
              content={(props) => (
                <ChartTooltip
                  active={props.active}
                  payload={props.payload as unknown as { payload: MemberPaid }[]}
                  formatMoney={formatMoney}
                  total={total}
                />
              )}
            />
            <Bar dataKey="paid" fill="#7661d7" barSize={20} radius={[0, 4, 4, 0]} isAnimationActive={false}>
              <LabelList
                dataKey="paid"
                position="right"
                offset={8}
                formatter={(value) => formatMoney(Number(value))}
                style={{ fill: '#1a2340', fontSize: 13, fontWeight: 700 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="group-chart__table">
        <caption>Pagado por cada miembro</caption>
        <thead>
          <tr>
            <th scope="col">Miembro</th>
            <th scope="col">Pagado</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <th scope="row">{item.name}</th>
              <td>{formatMoney(item.paid)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
