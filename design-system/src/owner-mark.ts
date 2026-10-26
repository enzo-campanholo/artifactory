// Outside the kept state's prefix, so signing out keeps it: an expired session on a device the owner
// studied on must show the sign-in notice, never a visitor's page.
export const ownerMarkKey = "artifactory-owner";

export function markOwner(): void {
  try {
    localStorage.setItem(ownerMarkKey, "");
  } catch {
    // Storage can be blocked or full. A public page then shows this device the visitor's form.
  }
}
