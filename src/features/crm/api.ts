import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/lib/supabase-utils'

export interface CustomerRecord {
    id: string
    name: string
    full_name: string | null
    contact_name: string | null
    contact_email: string | null
    phone: string | null
    country: string | null
    notes: string | null
}

export interface SupplierRecord {
    id: string
    name: string
    contact_name: string | null
    contact_email: string | null
    phone: string | null
    website: string | null
    notes: string | null
}

export async function fetchCustomers(): Promise<CustomerRecord[]> {
    const { data, error } = await supabase.from('customers').select('*').order('name')
    assertNoError(error, 'Failed to load customers')
    return (data ?? []) as CustomerRecord[]
}

export async function createCustomer(payload: {
    name: string
    full_name: string | null
    contact_name: string | null
    contact_email: string | null
    phone: string | null
    country: string | null
    notes: string | null
}): Promise<void> {
    const { error } = await supabase.from('customers').insert(payload)
    assertNoError(error, 'Failed to create customer')
}

export async function updateCustomer(
    id: string,
    payload: {
        name: string
        full_name: string | null
        contact_name: string | null
        contact_email: string | null
        phone: string | null
        country: string | null
        notes: string | null
    },
): Promise<void> {
    const { error } = await supabase
        .from('customers')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
    assertNoError(error, 'Failed to update customer')
}

export async function deleteCustomer(id: string): Promise<void> {
    const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
    assertNoError(error, 'Failed to delete customer')
}

export async function fetchSuppliers(): Promise<SupplierRecord[]> {
    const { data, error } = await supabase.from('suppliers').select('*').order('name')
    assertNoError(error, 'Failed to load suppliers')
    return (data ?? []) as SupplierRecord[]
}

export async function createSupplier(payload: {
    name: string
    contact_name: string | null
    contact_email: string | null
    phone: string | null
    website: string | null
    notes: string | null
}): Promise<void> {
    const { error } = await supabase.from('suppliers').insert(payload)
    assertNoError(error, 'Failed to create supplier')
}

export async function updateSupplier(
    id: string,
    payload: {
        name: string
        contact_name: string | null
        contact_email: string | null
        phone: string | null
        website: string | null
        notes: string | null
    },
): Promise<void> {
    const { error } = await supabase
        .from('suppliers')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
    assertNoError(error, 'Failed to update supplier')
}

export async function deleteSupplier(id: string): Promise<void> {
    const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id)
    assertNoError(error, 'Failed to delete supplier')
}
