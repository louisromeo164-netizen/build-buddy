/**
 * Sanitizes database/API error messages to prevent leaking
 * internal implementation details (table names, constraints, etc.)
 */
export function sanitizeError(error: any): string {
  const message = (error?.message || '').toLowerCase();

  // Map known database/trigger errors to user-friendly messages
  if (message.includes('duplicate key') || message.includes('already exists'))
    return 'This record already exists.';
  if (message.includes('foreign key'))
    return 'A referenced item was not found.';
  if (message.includes('not-null constraint') || message.includes('required'))
    return 'A required field is missing.';
  if (message.includes('check constraint'))
    return 'Invalid data provided.';
  if (message.includes('not enough seats'))
    return 'Not enough seats available for this ride.';
  if (message.includes('ride is not available'))
    return 'This ride is no longer available for booking.';
  if (message.includes('ride not found'))
    return 'The ride could not be found.';
  if (message.includes('unauthorized') || message.includes('permission'))
    return 'You do not have permission for this action.';
  if (message.includes('invalid login') || message.includes('invalid email or password'))
    return 'Invalid email or password.';
  if (message.includes('email not confirmed'))
    return 'Please confirm your email address before signing in.';
  if (message.includes('user already registered'))
    return 'An account with this email already exists.';

  // Generic fallback — never expose raw error
  return 'An error occurred. Please try again.';
}
