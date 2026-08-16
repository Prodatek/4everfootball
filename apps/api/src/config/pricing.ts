// Re-exports the actual pricing catalog from @4ef/shared — see the comment
// at the top of packages/shared/src/pricing.ts for why it lives there. This
// file exists so anything looking for pricing config at the brief's exact
// path (MONETISATION_BUILD_BRIEF.md §3.2) finds it.
export * from '@4ef/shared';
