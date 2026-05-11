export function buildBranchFilter(user: any, query: any) {
    // User must be logged in
    if (!user) return {};

    // If branchId provided in query → use it for all users
    if (query.branchId) {
        return { branchId: Number(query.branchId) };
    }

    // Otherwise → all branches (no restriction)
    return {};
}
