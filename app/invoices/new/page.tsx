'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation' // Added Router
import { supabase } from '@/lib/supabase'
import { createInvoiceAction } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash2, PlusCircle } from 'lucide-react' 

export default function NewInvoicePage() {
  const router = useRouter() // Initialize router
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Form State
  const [customerId, setCustomerId] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ description: '', quantity: 1, rate: 0 }])

  useEffect(() => {
    async function fetchCustomers() {
      const { data } = await supabase.from('customers').select('*').order('display_name')
      if (data) setCustomers(data)
    }
    fetchCustomers()
  }, [])

  const addItem = () => setItems([...items, { description: '', quantity: 1, rate: 0 }])
  
  const removeItem = (index: number) => {
    if (items.length === 1) return 
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await createInvoiceAction({ customerId, issueDate, dueDate, notes, items, totalAmount })
      // Use router to redirect upon success
      if (result.success) {
        router.push('/invoices')
      }
    } catch (error: any) {
      console.error(error)
      alert("Error: " + error.message)
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Create New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer *</label>
              <select 
                required 
                value={customerId} 
                onChange={(e) => setCustomerId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="" disabled>Select a customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.display_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Issue Date *</label>
              <Input type="date" required value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date *</label>
              <Input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Rate (Rs.)</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input placeholder="Service description" required value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min="1" required value={item.quantity} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min="0" step="0.01" required value={item.rate} onChange={(e) => updateItem(index, 'rate', Number(e.target.value))} />
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      Rs. {(item.quantity * item.rate).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={items.length === 1}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <Button type="button" variant="outline" onClick={addItem} className="gap-2">
              <PlusCircle className="h-4 w-4" /> Add Line Item
            </Button>
            
            <div className="flex justify-end pt-4 border-t">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-3xl font-bold">Rs. {totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Invoice"}
          </Button>
        </div>
      </form>
    </div>
  )
}