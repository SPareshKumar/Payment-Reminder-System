import { supabase } from "@/lib/supabase"
import { addCustomer } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function CustomersPage() {
  // Fetch existing customers from Supabase (Server-side rendering)
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Customers</h1>

      <div className="grid md:grid-cols-[350px_1fr] gap-8">
        
        {/* Left Side: Create Customer Form */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Add New Customer</CardTitle>
          </CardHeader>
          <CardContent>
            {/* The action attribute points directly to our Server Action */}
            <form action={addCustomer} className="space-y-4">
              <div className="space-y-2">
                <Input name="displayName" placeholder="Display Name (e.g. John Doe) *" required />
              </div>
              <div className="space-y-2">
                <Input name="email" type="email" placeholder="Email Address *" required />
              </div>
              <div className="space-y-2">
                <Input name="companyName" placeholder="Company Name (Optional)" />
              </div>
              <div className="space-y-2">
                {/* Using a native select here to save time on complex UI installations */}
                <select 
                  name="type" 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="business">Business</option>
                  <option value="individual">Individual</option>
                </select>
              </div>
              <Button type="submit" className="w-full mt-2">Save Customer</Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Side: Customer Data Table */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers?.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.display_name}</TableCell>
                  <TableCell>{customer.company_name || '-'}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell className="capitalize">
                    <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs">
                      {customer.type}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {!customers?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No customers found. Add your first customer to the left.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

      </div>
    </div>
  )
}