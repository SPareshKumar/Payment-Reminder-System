import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Vercel Cron requires a GET request
export async function GET(request: Request) {
  // 1. Authenticate the request to ensure only Vercel can trigger this
//   const authHeader = request.headers.get('authorization');
//   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
//     return new Response('Unauthorized', { status: 401 });
//   }

  try {
    // 2. Get Today's Date in IST
    const date = new Date()
    const istTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const todayIST = istTime.toISOString().split('T')[0]

    // 3. Update the database: Find 'pending' invoices where due_date is in the past
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'overdue' })
      .eq('status', 'pending') // Only touch pending invoices
      .lt('due_date', todayIST) // Where due date is Less Than (<) today
      .select()

    if (error) {
      console.error("Cron Database Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 4. Log the automated activity for each updated invoice
    if (data && data.length > 0) {
      const logsToInsert = data.map(invoice => ({
        invoice_id: invoice.id,
        action: 'System automatically marked invoice as overdue'
      }))
      
      await supabase.from('activity_logs').insert(logsToInsert)
    }

    return NextResponse.json({ 
      success: true, 
      message: `Updated ${data?.length || 0} invoices to overdue.`,
      updatedInvoices: data 
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}