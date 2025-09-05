/**
 * Middleware to ensure the authenticated user has an admin role.
 * Requires that requireAuth has already populated req.user. If the
 * user is not an admin a 403 response is returned.
 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }
  return next();
}