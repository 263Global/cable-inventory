import { supabase } from '@/lib/supabase'

export interface OmAdjustment {
    id: string
    inventory_resource_id: string
    batch_id: string | null
    start_date: string
    end_date: string
    type: 'waived' | 'prepaid' | 'discounted'
    amount: number
    notes: string | null
    created_at: string
}

export async function fetchOmAdjustments(resourceId: string): Promise<OmAdjustment[]> {
    const { data, error } = await supabase
        .from('om_adjustments')
        .select('*')
        .eq('inventory_resource_id', resourceId)
        .order('batch_id', { nullsFirst: true })
        .order('start_date')
    if (error) throw error
    return (data ?? []) as OmAdjustment[]
}

export async function insertOmAdjustment(record: {
    inventory_resource_id: string
    batch_id?: string | null
    start_date: string
    end_date: string
    type: string
    amount?: number
    notes?: string
}) {
    const { error } = await supabase.from('om_adjustments').insert(record)
    if (error) throw error
}

export async function updateOmAdjustment(id: string, updates: Partial<OmAdjustment>) {
    const { error } = await supabase.from('om_adjustments').update(updates).eq('id', id)
    if (error) throw error
}

export async function deleteOmAdjustment(id: string) {
    const { error } = await supabase.from('om_adjustments').delete().eq('id', id)
    if (error) throw error
}
