import { supabase } from '@/lib/supabase'
import { assertNoError } from '@/lib/supabase-utils'

export interface SalesFormCustomer {
    id: string
    name: string
}

export interface SalesFormResource {
    id: string
    resource_id: string
    cable_system_name: string | null
    type: string
    spec: string | null
    total_capacity: number | null
    used_capacity: number | null
    route_description: string | null
    landing_a_name: string | null
    landing_z_name: string | null
    handover_a_name: string | null
    handover_z_name: string | null
}

export interface AvailableCircuit {
    id: string
    circuit_number: number
    capacity: number
    interface_type: string
    status: string
    handover_a: string | null
    handover_z: string | null
}

interface ResourceJoinName {
    name: string
}

type JoinNameValue = ResourceJoinName | ResourceJoinName[] | null

interface RawSalesFormResourceRow {
    id: string
    resource_id: string
    type: string
    spec: string | null
    total_capacity: number | null
    used_capacity: number | null
    route_description: string | null
    cable_system: JoinNameValue
    landing_station_a: JoinNameValue
    landing_station_z: JoinNameValue
    handover_a: JoinNameValue
    handover_z: JoinNameValue
}

interface RawCircuitRow {
    id: string
    circuit_number: number
    capacity: number
    status: string
    current_type: JoinNameValue
    handover_a: JoinNameValue
    handover_z: JoinNameValue
}

function getJoinName(value: JoinNameValue): string | null {
    if (!value) return null
    if (Array.isArray(value)) {
        return value[0]?.name ?? null
    }
    return value.name ?? null
}

export async function fetchSalesFormReferences(): Promise<{
    customers: SalesFormCustomer[]
    resources: SalesFormResource[]
}> {
    const [{ data: custs, error: custErr }, { data: res, error: resErr }] = await Promise.all([
        supabase.from('customers').select('id, name').order('name'),
        supabase.from('inventory_resources').select(`
            id, resource_id, type, spec, total_capacity, used_capacity, route_description,
            cable_system:cable_systems(name),
            landing_station_a:landing_stations!inventory_resources_landing_station_a_id_fkey(name),
            landing_station_z:landing_stations!inventory_resources_landing_station_z_id_fkey(name),
            handover_a:handover_locations!inventory_resources_handover_location_a_id_fkey(name),
            handover_z:handover_locations!inventory_resources_handover_location_z_id_fkey(name)
        `).order('resource_id'),
    ])

    assertNoError(custErr, 'Failed to load customers')
    assertNoError(resErr, 'Failed to load inventory resources')

    return {
        customers: (custs ?? []) as SalesFormCustomer[],
        resources: ((res ?? []) as RawSalesFormResourceRow[]).map((resource) => ({
            id: resource.id as string,
            resource_id: resource.resource_id as string,
            type: resource.type as string,
            spec: resource.spec as string | null,
            total_capacity: resource.total_capacity as number | null,
            used_capacity: resource.used_capacity as number | null,
            route_description: resource.route_description as string | null,
            cable_system_name: getJoinName(resource.cable_system),
            landing_a_name: getJoinName(resource.landing_station_a),
            landing_z_name: getJoinName(resource.landing_station_z),
            handover_a_name: getJoinName(resource.handover_a),
            handover_z_name: getJoinName(resource.handover_z),
        })) as SalesFormResource[],
    }
}

export async function fetchAvailableCircuitsForResource(resourceId: string): Promise<AvailableCircuit[]> {
    const { data, error } = await supabase
        .from('inventory_circuits')
        .select(`id, circuit_number, capacity, status,
            current_type:interface_types!inventory_circuits_current_interface_type_id_fkey(name),
            handover_a:handover_locations!inventory_circuits_handover_location_a_id_fkey(name),
            handover_z:handover_locations!inventory_circuits_handover_location_z_id_fkey(name)`)
        .eq('inventory_resource_id', resourceId)
        .order('circuit_number')

    assertNoError(error, 'Failed to load circuits')

    return ((data ?? []) as RawCircuitRow[]).map((circuit) => ({
        id: circuit.id as string,
        circuit_number: circuit.circuit_number as number,
        capacity: circuit.capacity as number,
        interface_type: getJoinName(circuit.current_type) ?? '—',
        status: circuit.status as string,
        handover_a: getJoinName(circuit.handover_a),
        handover_z: getJoinName(circuit.handover_z),
    }))
}
