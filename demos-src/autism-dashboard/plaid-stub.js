// Stands in for react-plaid-link in the demo build, so no Plaid script is loaded.
export function usePlaidLink() {
  return { open: () => {}, ready: false, error: null, exit: () => {} };
}
export const PlaidLink = () => null;
