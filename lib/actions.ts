'use server'

import { supabase } from './supabase'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { z } from 'zod'

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

// Helper to get current IST date as YYYY-MM-DD
function getTodayIST() {
  const date = new Date()
  const istTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  return istTime.toISOString().split('T')[0]
}

// ==========================================
// ZOD SCHEMAS (Must be defined at the top)
// ==========================================

// 1. Define the strict runtime schema for Logos
const LogoSchema = z.object({
  url: z.string()
    .url({ message: "Must be a valid HTTPS URL." })
    .max(500, { message: "URL is too long." })
    .startsWith("https://", { message: "URL must be secure (https)." })
})

// 2. Define the schema for a single line item
const LineItemSchema = z.object({
  description: z.string().min(1, { message: "Description cannot be empty." }),
  quantity: z.number().int().positive({ message: "Quantity must be 1 or more." }),
  rate: z.number().positive({ message: "Rate must be greater than 0." })
})

// 3. Define the schema for the entire invoice submission
const CreateInvoiceSchema = z.object({
  customerId: z.string().min(1, { message: "Customer is required." }),
  issueDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid issue date format." }),
  dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  notes: z.string().default(''),
  totalAmount: z.number().positive({ message: "Total amount must be greater than 0." }),
  lineItems: z.array(LineItemSchema).min(1, { message: "Invoice must have at least one line item." })
})

// ==========================================
// SERVER ACTIONS
// ==========================================

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


export async function createInvoiceAction(payload: {
  customerId: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  items: { description: string; quantity: number; rate: number }[];
  totalAmount: number;
}) {
  // Fix: Mapped `payload.items` to the schema's expected `lineItems` key
  const validatedFields = CreateInvoiceSchema.safeParse({
    customerId: payload.customerId,
    issueDate: payload.issueDate,
    dueDate: payload.dueDate,
    notes: payload.notes,
    lineItems: payload.items, 
    totalAmount: payload.totalAmount,
  })

  if (!validatedFields.success) {
    const errorMessage = validatedFields.error.issues[0].message
    throw new Error(`Validation failed: ${errorMessage}`)
  }

  // Extract the safely validated data
  const { customerId, issueDate, dueDate, notes, lineItems, totalAmount } = validatedFields.data

  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`

  const todayIST = getTodayIST()
  // If the due date is strictly before today in India, it is instantly overdue
  const initialStatus = dueDate < todayIST ? 'overdue' : 'pending'

  // 1. Insert the Invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert([{
      customer_id: customerId,
      invoice_number: invoiceNumber,
      issue_date: issueDate,
      due_date: dueDate,
      status: initialStatus, 
      total_amount: totalAmount,
      notes: notes
    }])
    .select()
    .single()

  if (invoiceError) throw new Error("Invoice creation failed: " + invoiceError.message)

  // 2. Insert the Line Items (mapped from the validated lineItems)
  const lineItemsToInsert = lineItems.map(item => ({
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
  // 1. Fetch the invoice, customer, AND line_items
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*, customers(display_name, email), line_items(*)')
    .eq('id', invoiceId)
    .single()

  if (fetchError || !invoice) {
    throw new Error("Could not fetch invoice details.")
  }

  // 2. Fetch the company logo
  const { data: settings } = await supabase
    .from('company_settings')
    .select('logo_url')
    .eq('id', 1)
    .single()
    
  const logoUrl = settings?.logo_url || ''

  // 3. Generate the Email HTML based on the Template choice
  const emailHtml = generateEmailHtml(invoice, logoUrl)

  // 4. Send the email via Resend
  const { error: emailError } = await resend.emails.send({
    from: 'Binary Automates <onboarding@resend.dev>',
    to: invoice.customers.email, 
    subject: `Invoice ${invoice.invoice_number} from Binary Automates`,
    html: emailHtml
  })

  if (emailError) {
    console.error("Resend Error:", emailError)
    throw new Error("Failed to send email.")
  }

  // 5. Log activity and update status
  await supabase.from('activity_logs').insert([{ invoice_id: invoiceId, action: 'Email reminder sent to client' }])
  if (invoice.status === 'draft') {
    await supabase.from('invoices').update({ status: 'pending' }).eq('id', invoiceId)
  }

  revalidatePath('/invoices')
  revalidatePath('/dashboard')
  return { success: true }
}

// --- HELPER FUNCTION TO GENERATE EMAIL-SAFE HTML ---
function generateEmailHtml(invoice: any, logoUrl: string) {
  const template = invoice.template || 'classic'
  const formattedDate = new Date(invoice.issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const formattedDue = new Date(invoice.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  
  const logoElement = logoUrl 
    ? `<img src="${logoUrl}" alt="Company Logo" style="max-height: 50px; margin-bottom: 20px;" />` 
    : `<h2 style="margin: 0 0 20px 0; font-size: 24px;">YOUR COMPANY</h2>`

  const lineItemsHtml = invoice.line_items.map((item: any) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">Rs. ${item.rate}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">Rs. ${(item.quantity * item.rate).toFixed(2)}</td>
    </tr>
  `).join('')

  if (template === 'trendy') {
    return `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2563eb; color: white; padding: 40px; display: flex; justify-content: space-between; align-items: center;">
          <div style="background: white; padding: 5px; display: inline-block; border-radius: 4px;">${logoElement.replace('margin-bottom: 20px;', 'margin-bottom: 0;')}</div>
          <div style="text-align: right;">
            <h1 style="margin: 0; font-size: 28px;">INVOICE</h1>
            <p style="margin: 0; opacity: 0.8;">#${invoice.invoice_number}</p>
          </div>
        </div>
        <div style="padding: 40px;">
          <div style="margin-bottom: 30px;">
            <p style="color: #2563eb; font-weight: bold; margin: 0 0 5px 0;">INVOICE TO:</p>
            <p style="margin: 0; font-size: 18px; font-weight: bold;">${invoice.customers.display_name}</p>
            <p style="margin: 0; color: #4b5563;">${invoice.customers.email}</p>
          </div>
          <p style="margin: 0; color: #4b5563;">Date: ${formattedDate} | <strong style="color: #ef4444;">Due: ${formattedDue}</strong></p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 30px; margin-bottom: 30px; text-align: left;">
            <thead><tr style="border-bottom: 2px solid #bfdbfe; color: #2563eb;">
              <th style="padding: 12px;">Description</th><th style="padding: 12px;">Qty</th><th style="padding: 12px;">Rate</th><th style="padding: 12px; text-align: right;">Amount</th>
            </tr></thead>
            <tbody>${lineItemsHtml}</tbody>
          </table>
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; text-align: right;">
            <p style="color: #2563eb; font-weight: bold; margin: 0 0 5px 0;">TOTAL AMOUNT</p>
            <p style="margin: 0; font-size: 28px; font-weight: bold; color: #1e3a8a;">Rs. ${Number(invoice.total_amount).toFixed(2)}</p>
          </div>
        </div>
      </div>
    `
  }

  if (template === 'minimalist') {
    return `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 40px; color: #374151;">
        <div style="text-align: right; margin-bottom: 40px;">
          ${logoElement}
          <h1 style="margin: 0; font-size: 36px; font-weight: 300; color: #d1d5db;">INVOICE</h1>
          <p style="margin: 0; font-weight: bold;">${invoice.invoice_number}</p>
        </div>
        <div style="margin-bottom: 40px;">
          <p style="color: #9ca3af; margin: 0 0 5px 0;">Billed To</p>
          <p style="margin: 0; font-size: 18px; font-weight: bold;">${invoice.customers.display_name}</p>
          <p style="margin: 0; color: #6b7280;">${invoice.customers.email}</p>
          <p style="margin: 20px 0 0 0; color: #9ca3af;">Due Date: <strong style="color: #374151;">${formattedDue}</strong></p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; text-align: left;">
          <tbody>${lineItemsHtml}</tbody>
        </table>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: right; font-size: 24px;">
          <span style="color: #9ca3af;">Total: </span><strong>Rs. ${Number(invoice.total_amount).toFixed(2)}</strong>
        </div>
      </div>
    `
  }

  // Default Classic Template
  return `
    <div style="font-family: serif; max-w: 600px; margin: 0 auto; padding: 40px; border: 1px solid #000; color: #000;">
      <div style="border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
        ${logoElement}
        <p style="margin: 0;">INVOICE #${invoice.invoice_number}</p>
        <p style="margin: 10px 0 0 0;">Date: ${formattedDate} | Due: ${formattedDue}</p>
      </div>
      <div style="margin-bottom: 30px;">
        <h3 style="margin: 0 0 10px 0; border-bottom: 1px solid #000; display: inline-block;">BILL TO</h3>
        <p style="margin: 0;">${invoice.customers.display_name}</p>
        <p style="margin: 0;">${invoice.customers.email}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; text-align: left; border: 1px solid #000;">
        <thead><tr style="background-color: #f3f4f6; border-bottom: 1px solid #000;">
          <th style="padding: 10px; border-right: 1px solid #000;">Description</th><th style="padding: 10px; border-right: 1px solid #000;">Qty</th><th style="padding: 10px; border-right: 1px solid #000;">Rate</th><th style="padding: 10px;">Amount</th>
        </tr></thead>
        <tbody>
          ${invoice.line_items.map((item: any) => `
            <tr style="border-bottom: 1px solid #000;">
              <td style="padding: 10px; border-right: 1px solid #000;">${item.description}</td>
              <td style="padding: 10px; border-right: 1px solid #000;">${item.quantity}</td>
              <td style="padding: 10px; border-right: 1px solid #000;">Rs. ${item.rate}</td>
              <td style="padding: 10px; font-weight: bold;">Rs. ${(item.quantity * item.rate).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="text-align: right; font-size: 20px; font-weight: bold; border-top: 2px solid #000; padding-top: 20px;">
        TOTAL DUE: Rs. ${Number(invoice.total_amount).toFixed(2)}
      </div>
    </div>
  `
}

export async function updateInvoiceStatus(invoiceId: string, newStatus: string) {
  const { error } = await supabase
    .from('invoices')
    .update({ status: newStatus })
    .eq('id', invoiceId)

  if (error) throw new Error("Failed to update status: " + error.message)

  // Log the manual change
  await supabase
    .from('activity_logs')
    .insert([{
      invoice_id: invoiceId,
      action: `Status manually updated to ${newStatus}`
    }])

  revalidatePath('/invoices')
  revalidatePath('/dashboard')
}

export async function updateCompanyLogo(rawUrl: string) {
  // 2. Validate the incoming data against the schema
  const validatedFields = LogoSchema.safeParse({ url: rawUrl })

  // 3. If validation fails, throw an error immediately before hitting the DB
  if (!validatedFields.success) {
    // We grab the first error message from Zod to send back to the frontend
    const errorMessage = validatedFields.error.issues[0].message
    throw new Error(`Validation failed: ${errorMessage}`)
  }

  // 4. If it passes, we use the strictly typed and sanitized data
  const safeUrl = validatedFields.data.url

  const { error } = await supabase
    .from('company_settings')
    .update({ logo_url: safeUrl })
    .eq('id', 1)

  if (error) throw new Error("Database error: Failed to save logo")
  
  revalidatePath('/invoices')
}

export async function updateInvoiceTemplate(invoiceId: string, template: string) {
  const { error } = await supabase
    .from('invoices')
    .update({ template: template })
    .eq('id', invoiceId)

  if (error) throw new Error("Failed to save template")
  revalidatePath('/invoices')
}