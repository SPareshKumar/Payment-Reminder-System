'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

export default function DashboardCharts({ invoices }: { invoices: any[] }) {
  // 1. Process data for the Doughnut Chart (Status Breakdown)
  const statusData = useMemo(() => {
    const amounts = { paid: 0, overdue: 0, pending: 0, draft: 0 }
    invoices.forEach(inv => {
      if (amounts[inv.status as keyof typeof amounts] !== undefined) {
        amounts[inv.status as keyof typeof amounts] += Number(inv.total_amount)
      }
    })
    
    return [
      { name: 'Paid', value: amounts.paid, color: '#16a34a' },     // Green
      { name: 'Overdue', value: amounts.overdue, color: '#dc2626' }, // Red
      { name: 'Pending', value: amounts.pending, color: '#eab308' }, // Yellow
      { name: 'Draft', value: amounts.draft, color: '#9ca3af' },     // Gray
    ].filter(d => d.value > 0) // Only show statuses that have money
  }, [invoices])

  // 2. Process data for Monthly Cash Flow (Bar) & Volume (Line)
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string, billed: number, paid: number, count: number }> = {}
    
    // Sort invoices chronologically by issue_date
    const sorted = [...invoices].sort((a, b) => new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime())
    
    sorted.forEach(inv => {
      const date = new Date(inv.issue_date)
      const monthName = date.toLocaleString('en-IN', { month: 'short' }) // e.g., "Feb", "Mar"
      
      if (!months[monthName]) {
        months[monthName] = { month: monthName, billed: 0, paid: 0, count: 0 }
      }
      
      months[monthName].count += 1
      months[monthName].billed += Number(inv.total_amount)
      if (inv.status === 'paid') {
        months[monthName].paid += Number(inv.total_amount)
      }
    })
    return Object.values(months)
  }, [invoices])

  return (
    // Use an invisible React Fragment so the cards become direct children of the main grid
    <>
      {/* Chart 1: Status Breakdown (Doughnut) - Will snap to Top Right */}
      <Card className="col-span-1">
        <CardHeader><CardTitle>Receivables Breakdown</CardTitle></CardHeader>
        <CardContent className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `Rs. ${value.toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chart 2: Cash Flow (Bar) - Will snap to Bottom Left */}
      <Card className="col-span-1">
        <CardHeader><CardTitle>Cash Flow (Billed vs. Paid)</CardTitle></CardHeader>
        <CardContent className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
              <Tooltip formatter={(value: number) => `Rs. ${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="billed" name="Total Billed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="paid" name="Actually Paid" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chart 3: Invoice Volume (Line) - Will snap to Bottom Right */}
      <Card className="col-span-1">
        <CardHeader><CardTitle>Invoice Volume Trend</CardTitle></CardHeader>
        <CardContent className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="Invoices Sent" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  )
}