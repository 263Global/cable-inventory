export interface SupabaseErrorLike {
    message: string
}

export function assertNoError(
    error: SupabaseErrorLike | null,
    context: string,
): void {
    if (error) {
        throw new Error(`${context}: ${error.message}`)
    }
}
