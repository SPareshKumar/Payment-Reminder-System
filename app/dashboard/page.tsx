import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import DashboardCharts from "@/components/ui/DashboardCharts"
import { IndianRupee, FileText, AlertCircle, CheckCircle2, ArrowRight, Plus } from "lucide-react"

export default async function DashboardPage() {
  // Fetch all invoices with their associated customer names
  // We order by due_date so the overdue table shows the most urgent ones first
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, customers(display_name)')
    .order('due_date', { ascending: true })

  // Safe fallback to an empty array if there is no data yet
  const safeInvoices = invoices || []

  // 1. Calculate Core Financial Metrics
  const totalInvoices = safeInvoices.length

  const paidAmount = safeInvoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.total_amount), 0)

  const overdueAmount = safeInvoices
    .filter(i => i.status === 'overdue')
    .reduce((sum, i) => sum + Number(i.total_amount), 0)

  const outstandingAmount = safeInvoices
    .filter(i => ['pending', 'overdue', 'draft'].includes(i.status))
    .reduce((sum, i) => sum + Number(i.total_amount), 0)

  // 2. Filter data for the "Action Required" table (Top 5 overdue)
  const recentOverdue = safeInvoices
    .filter(i => i.status === 'overdue')
    .slice(0, 5)

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex justify-between items-center">
        {/* We can also make the text slightly smaller on mobile so it doesn't wrap! */}
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        
        <Link href="/invoices/new">
          <Button className="gap-2 px-3 md:px-4">
            <Plus className="h-5 w-5" />
            {/* 'hidden' removes the text on mobile, 'md:inline' brings it back on tablets/desktop */}
            <span className="hidden md:inline">Create New Invoice</span>
          </Button>
        </Link>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        {/* Outstanding Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {outstandingAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Pending + Overdue + Draft</p>
          </CardContent>
        </Card>

        {/* Overdue Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Overdue Amount</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">Rs. {overdueAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Requires immediate action</p>
          </CardContent>
        </Card>

        {/* Paid Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Rs. {paidAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Successfully collected</p>
          </CardContent>
        </Card>

        {/* Total Count Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
            <p className="text-xs text-muted-foreground">Generated to date</p>
          </CardContent>
        </Card>

      </div>

      {/* 50/50 Split Layout: Overdue Table (Left) & Visuals (Right) */}
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        
        {/* LEFT COLUMN: Action Required Table */}
        <Card className="col-span-1 shadow-md border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50 rounded-t-xl">
            <CardTitle className="text-black">Action Required: Overdue</CardTitle>
            <Link href="/invoices">
              <Button variant="ghost" size="sm" className="gap-1 text-black hover:text-gray-700 hover:bg-gray-100">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-6 max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOverdue.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                      Great job! No overdue invoices right now.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentOverdue.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium text-blue-600">
                        <Link href={`/invoices?search=${invoice.invoice_number}`}>{invoice.invoice_number}</Link>
                      </TableCell>
                      <TableCell>{invoice.customers?.display_name}</TableCell>
                      <TableCell className="font-medium text-red-600 text-right whitespace-nowrap">
                        Rs. {Number(invoice.total_amount).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* The Fragment will automatically distribute the 3 charts into the remaining grid slots */}
        <DashboardCharts invoices={safeInvoices} />

      </div>

    </div>
  )
}