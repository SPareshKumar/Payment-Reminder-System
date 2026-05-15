'use client'

import { useState, useEffect, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { updateCompanyLogo, updateInvoiceTemplate, sendReminderEmail } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Mail, Send, Image as ImageIcon, LayoutTemplate } from 'lucide-react'

export default function InvoicePreviewPage() {
  const params = useParams()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // Data States
  const [invoice, setInvoice] = useState<any>(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(true)

  // Settings States
  const [activeTemplate, setActiveTemplate] = useState('classic')
  const [tempLogoUrl, setTempLogoUrl] = useState('')

  useEffect(() => {
    async function fetchData() {
      // Fetch the specific invoice WITH its customer and line items
      const { data: invData } = await supabase
        .from('invoices')
        .select('*, customers(*), line_items(*)')
        .eq('id', params.id)
        .single()
        
      // Fetch the global company settings
      const { data: settingsData } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', 1)
        .single()

      if (invData) {
        setInvoice(invData)
        setActiveTemplate(invData.template || 'classic')
      }
      if (settingsData) {
        setLogoUrl(settingsData.logo_url)
        setTempLogoUrl(settingsData.logo_url)
      }
      setLoading(false)
    }
    fetchData()
  }, [params.id])

  // Handlers
  const handleSaveLogo = async () => {
    try {
      await updateCompanyLogo(tempLogoUrl)
      setLogoUrl(tempLogoUrl)
      alert("Logo saved successfully!")
    } catch (error) {
      alert("Failed to save logo.")
    }
  }

  const handleTemplateChange = async (newTemplate: string) => {
    setActiveTemplate(newTemplate)
    try {
      await updateInvoiceTemplate(invoice.id, newTemplate)
    } catch (error) {
      console.error("Failed to save template to DB", error)
    }
  }

  const handleSendEmail = () => {
    startTransition(async () => {
      try {
        await sendReminderEmail(invoice.id)
        alert("Invoice emailed successfully!")
      } catch (error) {
        alert("Failed to send email.")
      }
    })
  }

  if (loading) return <div className="p-8 text-center">Loading preview...</div>
  if (!invoice) return <div className="p-8 text-center text-red-500">Invoice not found.</div>

  // TEMPLATE RENDERER
  const renderTemplate = () => {
    const formattedDate = new Date(invoice.issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const formattedDue = new Date(invoice.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })

    // 1. CLASSIC TEMPLATE
    if (activeTemplate === 'classic') {
      return (
        <div className="p-8 bg-white text-black font-serif border">
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-8">
            <div>
              {logoUrl ? <img src={logoUrl} alt="Logo" className="h-12 object-contain mb-4" /> : <h2 className="text-2xl font-bold">YOUR COMPANY</h2>}
              <p className="text-sm">INVOICE #{invoice.invoice_number}</p>
            </div>
            <div className="text-right text-sm">
              <p><strong>Date:</strong> {formattedDate}</p>
              <p><strong>Due:</strong> {formattedDue}</p>
            </div>
          </div>
          <div className="mb-8">
            <h3 className="font-bold border-b border-black inline-block mb-2">BILL TO</h3>
            <p>{invoice.customers.display_name}</p>
            <p>{invoice.customers.company_name}</p>
            <p>{invoice.customers.email}</p>
          </div>
          <table className="w-full text-left border-collapse border border-black mb-8">
            <thead>
              <tr className="bg-gray-100 border-b border-black">
                <th className="p-2 border-r border-black">Description</th>
                <th className="p-2 border-r border-black">Qty</th>
                <th className="p-2 border-r border-black">Rate</th>
                <th className="p-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((item: any) => (
                <tr key={item.id} className="border-b border-black">
                  <td className="p-2 border-r border-black">{item.description}</td>
                  <td className="p-2 border-r border-black">{item.quantity}</td>
                  <td className="p-2 border-r border-black">Rs. {item.rate}</td>
                  <td className="p-2 font-bold">Rs. {(item.quantity * item.rate).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right text-xl font-bold border-t-2 border-black pt-4">
            TOTAL DUE: Rs. {Number(invoice.total_amount).toFixed(2)}
          </div>
        </div>
      )
    }

    // 2. MINIMALIST TEMPLATE
    if (activeTemplate === 'minimalist') {
      return (
        <div className="p-8 bg-white text-gray-800 font-sans">
          <div className="flex justify-between items-center mb-12">
            {logoUrl ? <img src={logoUrl} alt="Logo" className="h-10 object-contain" /> : <h2 className="text-xl font-medium tracking-widest text-gray-400">YOUR COMPANY</h2>}
            <div className="text-right">
              <h1 className="text-4xl font-light text-gray-300">INVOICE</h1>
              <p className="text-sm font-medium mt-1">{invoice.invoice_number}</p>
            </div>
          </div>
          <div className="flex justify-between mb-12 text-sm">
            <div>
              <p className="text-gray-400 mb-1">Billed To</p>
              <p className="font-medium text-lg">{invoice.customers.display_name}</p>
              <p className="text-gray-500">{invoice.customers.email}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 mb-1">Due Date</p>
              <p className="font-medium">{formattedDue}</p>
            </div>
          </div>
          <div className="space-y-4 mb-12">
            {invoice.line_items.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center py-4 border-b border-gray-100">
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-sm text-gray-400">{item.quantity} x Rs. {item.rate}</p>
                </div>
                <p className="font-medium">Rs. {(item.quantity * item.rate).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-6 text-2xl font-light">
            <span className="text-gray-400">Total</span>
            <span className="font-medium">Rs. {Number(invoice.total_amount).toFixed(2)}</span>
          </div>
        </div>
      )
    }

    // 3. TRENDY / AESTHETIC TEMPLATE
    if (activeTemplate === 'trendy') {
      return (
      <div className="bg-white text-gray-900 font-sans shadow-md rounded-lg overflow-hidden">
        <div className="bg-blue-600 p-8 text-white flex justify-between items-center">
          {logoUrl ? <img src={logoUrl} alt="Logo" className="h-12 bg-white p-1 rounded object-contain" /> : <h2 className="text-2xl font-bold">YOUR COMPANY</h2>}
          <div className="text-right">
            <h1 className="text-3xl font-bold">INVOICE</h1>
            <p className="opacity-80">#{invoice.invoice_number}</p>
          </div>
        </div>
        <div className="p-8">
          <div className="flex justify-between mb-8">
            <div>
              <h3 className="text-blue-600 font-bold mb-2">INVOICE TO:</h3>
              <p className="font-medium text-lg">{invoice.customers.display_name}</p>
              <p className="text-gray-600">{invoice.customers.email}</p>
            </div>
            <div className="text-right">
              <p><span className="text-gray-500">Date:</span> {formattedDate}</p>
              <p><span className="text-gray-500">Due:</span> <span className="font-bold text-red-500">{formattedDue}</span></p>
            </div>
          </div>
          <table className="w-full text-left mb-8">
            <thead>
              <tr className="border-b-2 border-blue-100 text-blue-600">
                <th className="py-3">Description</th>
                <th className="py-3">Qty</th>
                <th className="py-3">Rate</th>
                <th className="py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((item: any) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-4">{item.description}</td>
                  <td className="py-4 text-gray-600">{item.quantity}</td>
                  <td className="py-4 text-gray-600">Rs. {item.rate}</td>
                  <td className="py-4 text-right font-medium">Rs. {(item.quantity * item.rate).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end">
            <div className="bg-blue-50 p-6 rounded-lg w-64 text-right">
              <p className="text-blue-600 font-bold mb-1">TOTAL AMOUNT</p>
              <p className="text-3xl font-bold text-blue-900">Rs. {Number(invoice.total_amount).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    )
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/invoices')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Invoice Settings & Preview</h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">
        
        {/* LEFT COLUMN: The Gmail UI Wrapper */}
        <div className="rounded-xl border shadow-2xl bg-white overflow-hidden flex flex-col h-fit">
          {/* Fake Browser/Email Header */}
          <div className="bg-gray-100 border-b px-4 py-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            <div className="ml-4 flex items-center gap-2 text-sm text-gray-500 font-medium">
              <Mail className="h-4 w-4" /> Message Preview
            </div>
          </div>
          
          {/* Fake Email Details */}
          <div className="border-b p-4 text-sm space-y-2 bg-white">
            <div className="flex border-b pb-2">
              <span className="w-16 text-gray-500">To:</span>
              <span className="font-medium">{invoice.customers.email}</span>
            </div>
            <div className="flex border-b pb-2">
              <span className="w-16 text-gray-500">Subject:</span>
              <span className="font-medium">Invoice {invoice.invoice_number} from Binary Automates</span>
            </div>
            <div className="flex pt-1 text-gray-500">
              Please find your invoice attached below.
            </div>
          </div>

          {/* The Actual Invoice Rendered inside the email body */}
          <div className="p-8 bg-gray-50 overflow-auto">
            {renderTemplate()}
          </div>
        </div>

        {/* RIGHT COLUMN: Settings Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ImageIcon className="h-5 w-5 text-blue-600" /> Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Company Logo URL</label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="https://example.com/logo.png" 
                    value={tempLogoUrl}
                    onChange={(e) => setTempLogoUrl(e.target.value)}
                  />
                  <Button variant="secondary" onClick={handleSaveLogo}>Save</Button>
                </div>
                <p className="text-xs text-muted-foreground">Paste a direct link to an image file.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LayoutTemplate className="h-5 w-5 text-blue-600" /> Template Style
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <Button 
                  variant={activeTemplate === 'classic' ? 'default' : 'outline'} 
                  className="justify-start h-12"
                  onClick={() => handleTemplateChange('classic')}
                >
                  <span className="font-serif">Classic (Corporate)</span>
                </Button>
                
                <Button 
                  variant={activeTemplate === 'minimalist' ? 'default' : 'outline'} 
                  className="justify-start h-12"
                  onClick={() => handleTemplateChange('minimalist')}
                >
                  <span className="font-sans font-light">Minimalist (Modern)</span>
                </Button>

                <Button 
                  // Catch both 'trendy' and any old 'wave' data from the database
                  variant={(activeTemplate === 'trendy' || activeTemplate === 'wave') ? 'default' : 'outline'} 
                  className="justify-start h-12"
                  onClick={() => handleTemplateChange('trendy')}
                >
                  <span className="font-sans font-bold text-blue-600">Trendy (Aesthetic)</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full h-12 text-lg gap-2" 
            onClick={handleSendEmail}
            disabled={isPending}
          >
            <Send className="h-5 w-5" /> 
            {isPending ? "Sending Email..." : "Send Final Invoice"}
          </Button>
        </div>

      </div>
    </div>
  )
}