import type { InventoryResource } from '@/types'

export type MaybeRelation<T> = T | T[] | null

export interface NamedJoin {
    name: string
}

export interface HandoverJoin {
    name: string
    city: string | null
}

export interface SalesOrderJoin {
    order_id: string
    status: string
    customers: MaybeRelation<NamedJoin>
}

export interface LinkedSalesItemRow {
    id: string
    sales_order_id: string
    capacity: number | null
    disposal_type: string | null
    status: string
    sales_orders: MaybeRelation<SalesOrderJoin>
}

export interface ResourceSalesOrderRow {
    sales_orders: MaybeRelation<Pick<SalesOrderJoin, 'order_id' | 'status'>>
}

export type InventoryResourceQueryRow = Omit<
    InventoryResource,
    | 'cable_system_name'
    | 'supplier_name'
    | 'country_a'
    | 'country_z'
    | 'landing_station_a_name'
    | 'landing_station_z_name'
    | 'handover_a_name'
    | 'handover_z_name'
> & {
    cable_system: MaybeRelation<NamedJoin>
    supplier: MaybeRelation<NamedJoin>
    country_a: MaybeRelation<NamedJoin>
    country_z: MaybeRelation<NamedJoin>
    landing_station_a: MaybeRelation<NamedJoin>
    landing_station_z: MaybeRelation<NamedJoin>
    handover_a: MaybeRelation<HandoverJoin>
    handover_z: MaybeRelation<HandoverJoin>
}

export type InventoryResourceWritePayload = Partial<
    Omit<
        InventoryResource,
        | 'id'
        | 'resource_id'
        | 'created_at'
        | 'cable_system_name'
        | 'supplier_name'
        | 'country_a'
        | 'country_z'
        | 'landing_station_a_name'
        | 'landing_station_z_name'
        | 'handover_a_name'
        | 'handover_z_name'
    >
>

export const inventoryResourceSelect = `
      *,
      cable_system:cable_systems(name),
      supplier:suppliers(name),
      country_a:countries!country_a_id(name),
      country_z:countries!country_z_id(name),
      landing_station_a:landing_stations!landing_station_a_id(name),
      landing_station_z:landing_stations!landing_station_z_id(name),
      handover_a:handover_locations!handover_location_a_id(name, city),
      handover_z:handover_locations!handover_location_z_id(name, city)
    `

export function pickRelation<T>(value: MaybeRelation<T> | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null
    return value ?? null
}

export function mapInventoryResourceRow(row: InventoryResourceQueryRow): InventoryResource {
    const {
        cable_system,
        supplier,
        country_a,
        country_z,
        landing_station_a,
        landing_station_z,
        handover_a,
        handover_z,
        ...resource
    } = row

    return {
        ...resource,
        cable_system_name: pickRelation(cable_system)?.name ?? null,
        supplier_name: pickRelation(supplier)?.name ?? null,
        country_a: pickRelation(country_a)?.name ?? null,
        country_z: pickRelation(country_z)?.name ?? null,
        landing_station_a_name: pickRelation(landing_station_a)?.name ?? null,
        landing_station_z_name: pickRelation(landing_station_z)?.name ?? null,
        handover_a_name: pickRelation(handover_a)?.name ?? null,
        handover_z_name: pickRelation(handover_z)?.name ?? null,
    }
}
