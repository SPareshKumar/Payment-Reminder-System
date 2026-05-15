import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IndianRupee, FileText, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react"

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
    <div className="p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <Link href="/invoices/new">
          <Button>Create New Invoice</Button>
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

      {/* Actionable Overdue Table */}
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Action Required: Overdue Invoices</CardTitle>
            <Link href="/invoices">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOverdue.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      Great job! No overdue invoices right now.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentOverdue.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium text-blue-600">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.customers?.display_name}</TableCell>
                      <TableCell className="font-medium text-red-600">Rs. {Number(invoice.total_amount).toFixed(2)}</TableCell>
                      <TableCell>
                        {new Date(invoice.due_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}