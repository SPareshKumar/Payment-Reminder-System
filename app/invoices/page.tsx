'use client'

import { useState, useEffect, useTransition } from 'react' // Added useTransition
import { sendReminderEmail } from '@/lib/actions'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { updateInvoiceStatus } from '@/lib/actions'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Search, Plus, Send, ChevronDown } from 'lucide-react' // Added ChevronDown


export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filtering State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [isPending, startTransition] = useTransition()
  const [remindingId, setRemindingId] = useState<string | null>(null)

  const handleRemind = (invoiceId: string) => {
    setRemindingId(invoiceId)
    startTransition(async () => {
      try {
        await sendReminderEmail(invoiceId)
        alert("Reminder sent successfully!")
      } catch (error) {
        alert("Failed to send reminder.")
      } finally {
        setRemindingId(null)
      }
    })

  }
  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    try {
      // Optimistically we could update UI state here, but revalidatePath will refresh it quickly
      await updateInvoiceStatus(invoiceId, newStatus)
      // Re-fetch locally to instantly update the table view
      const { data } = await supabase.from('invoices').select('*, customers(display_name)').order('created_at', { ascending: false })
      if (data) setInvoices(data)
    } catch (error) {
      alert("Failed to update status.")
    }
  }

  // Fetch invoices and join with customer data
  useEffect(() => {
    async function fetchInvoices() {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers ( display_name )
        `)
        .order('created_at', { ascending: false })

      if (data) setInvoices(data)
      setLoading(false)
    }
    fetchInvoices()
  }, [])

  // Stripe-inspired status badges
  const StatusDropdown = ({ invoice }: { invoice: any }) => {
    let colorClass = 'bg-gray-100 text-gray-800 hover:bg-gray-100' // default draft
    if (invoice.status === 'paid') colorClass = 'bg-green-100 text-green-800 hover:bg-green-100'
    if (invoice.status === 'overdue') colorClass = 'bg-red-100 text-red-800 hover:bg-red-100'
    if (invoice.status === 'pending') colorClass = 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'

    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="focus:outline-none">
          <Badge className={`${colorClass} cursor-pointer flex items-center gap-1 transition-all`}>
            <span className="capitalize">{invoice.status}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'draft')}>Draft</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'pending')}>Pending</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'overdue')}>Overdue</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'paid')}>Paid</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // The Search & Filter Engine
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customers?.display_name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        <Link href="/invoices/new">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Create Invoice</Button>
        </Link>
      </div>

      {/* Controls: Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client or invoice number..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="flex h-10 w-full sm:w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading invoices...</TableCell></TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No invoices found matching your criteria.</TableCell></TableRow>
            ) : (
              filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium text-blue-600">{invoice.invoice_number}</TableCell>
                  <TableCell>{invoice.customers?.display_name}</TableCell>
                  <TableCell className="font-medium">Rs. {invoice.total_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    {new Date(invoice.due_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </TableCell>
                  <TableCell>
                    <StatusDropdown invoice={invoice} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-muted-foreground hover:text-primary"
                      onClick={() => handleRemind(invoice.id)}
                      disabled={isPending && remindingId === invoice.id}
                    >
                      <Send className="h-4 w-4" />
                      {isPending && remindingId === invoice.id ? "Sending..." : "Remind"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}