'use server'

import { supabase } from './supabase'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

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

export async function sendReminderEmail(invoiceId: string) {
  // 1. Fetch the invoice and the associated customer's email
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*, customers(display_name, email)')
    .eq('id', invoiceId)
    .single()

  if (fetchError || !invoice) {
    throw new Error("Could not fetch invoice details.")
  }

  // 2. Send the email via Resend
  // Note: On the free tier, Resend requires you to send FROM 'onboarding@resend.dev' 
  // and TO the exact email address you used to sign up for Resend. 
  // (In a production app with a verified domain, this would be your actual email).
  const { error: emailError } = await resend.emails.send({
    from: 'Binary Automates <onboarding@resend.dev>',
    to: invoice.customers.email, // Ensure you use your own email for testing!
    subject: `Payment Reminder: Invoice ${invoice.invoice_number}`,
    html: `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
        <h2>Hello ${invoice.customers.display_name},</h2>
        <p>This is a friendly reminder that invoice <strong>${invoice.invoice_number}</strong> for <strong>Rs. ${invoice.total_amount}</strong> is currently due.</p>
        <p>Please arrange payment at your earliest convenience.</p>
        <br/>
        <p>Thank you!</p>
      </div>
    `
  })

  if (emailError) {
    console.error("Resend Error:", emailError)
    throw new Error("Failed to send email.")
  }

  // 3. Log the activity in the database
  await supabase
    .from('activity_logs')
    .insert([{
      invoice_id: invoiceId,
      action: 'Email reminder sent to client'
    }])

  // 4. Update the invoice status if it was just a draft
  if (invoice.status === 'draft') {
    await supabase.from('invoices').update({ status: 'pending' }).eq('id', invoiceId)
  }

  // 5. Refresh the UI
  revalidatePath('/invoices')
  revalidatePath('/dashboard')
  
  return { success: true }
}