import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value)
}

export function formatCapacity(value: number, unit: string): string {
    return `${value}${unit}`
}

export function generateResourceId(): string {
    const num = Math.floor(10000 + Math.random() * 90000)
    return `RES-${num}`
}
