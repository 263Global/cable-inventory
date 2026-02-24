import type { ResourceStatus, ResourceType, SalesStatus } from '@/types'

export const salesStatusBadgeClass: Record<SalesStatus, string> = {
    Draft: 'bg-gray-500/15 text-gray-400',
    'Pre-sold': 'bg-amber-500/15 text-amber-400',
    Active: 'bg-emerald-500/15 text-emerald-400',
    Expired: 'bg-red-500/15 text-red-400',
    Terminated: 'bg-red-500/15 text-red-400',
    Cancelled: 'bg-gray-500/15 text-gray-400',
}

export const resourceStatusBadgeClass: Record<ResourceStatus, string> = {
    'Available': 'bg-status-available/15 text-status-available',
    'Partially Used': 'bg-status-partial/15 text-status-partial',
    'Fully Used': 'bg-status-full/15 text-status-full',
    'Expired': 'bg-status-expired/15 text-status-expired',
    'Terminated': 'bg-status-expired/15 text-status-expired',
}

export const resourceStatusLabel: Partial<Record<ResourceStatus, string>> = {
    'Partially Used': 'Partial',
    'Fully Used': 'Full',
}

export const resourceTypeBadgeClass: Record<ResourceType, string> = {
    'Capacity': 'bg-primary/15 text-primary',
    'Terrestrial': 'bg-info/15 text-info',
    'Fiber': 'bg-warning/15 text-warning',
    'Spectrum': 'bg-purple-500/15 text-purple-400',
}

export const resourceTypeTextClass: Record<ResourceType, string> = {
    'Capacity': 'text-primary',
    'Terrestrial': 'text-info',
    'Fiber': 'text-warning',
    'Spectrum': 'text-purple-400',
}
