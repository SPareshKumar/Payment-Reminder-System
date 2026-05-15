'use server'

import { supabase } from './supabase'
import { revalidatePath } from 'next/cache'

export async function addCustomer(formData: FormData) {
  // Extract values from the form
  const displayName = formData.get('displayName') as string
  const email = formData.get('email') as string
  const companyName = formData.get('companyName') as string
  const type = formData.get('type') as string || 'business'

  // Insert into Supabase
  const { error } = await supabase
    .from('customers')
    .insert([{
      display_name: displayName,
      email: email,
      company_name: companyName,
      type: type
    }])

  if (error) {
    console.error("Database Error:", error.message)
    throw new Error(error.message)
  }
  
  // Revalidate the cache so the UI updates instantly
  revalidatePath('/customers')
}

// lib/actions.ts

export async function createInvoiceAction(payload: {
  customerId: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  items: { description: string; quantity: number; rate: number }[];
  totalAmount: number;
}) {
  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`

  // 1. Insert the Invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert([{
      customer_id: payload.customerId,
      invoice_number: invoiceNumber,
      issue_date: payload.issueDate,
      due_date: payload.dueDate,
      status: 'pending', 
      total_amount: payload.totalAmount,
      notes: payload.notes
    }])
    .select()
    .single()

  if (invoiceError) throw new Error("Invoice creation failed: " + invoiceError.message)

  // 2. Insert the Line Items
  const lineItemsToInsert = payload.items.map(item => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    rate: Number(item.rate) 
  }))

  const { error: itemsError } = await supabase
    .from('line_items')
    .insert(lineItemsToInsert)

  if (itemsError) throw new Error("Line items creation failed: " + itemsError.message)

  // 3. Log the Activity
  await supabase
    .from('activity_logs')
    .insert([{
      invoice_id: invoice.id,
      action: 'Invoice created and set to pending'
    }])

  // Revalidate caches and return success instead of redirecting
  revalidatePath('/dashboard')
  revalidatePath('/invoices')
  return { success: true }
}