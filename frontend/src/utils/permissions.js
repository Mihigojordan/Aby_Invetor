/**
 * Checks whether an employee has a specific action permission for a feature.
 * Admins always have full access (they have no Permission rows at all).
 * @param {Object} user - The employee's user object (from useEmployeeAuth), expected to carry `.permissions`
 * @param {string} role - 'admin' or 'employee'
 * @param {string} featureKey - Feature key, e.g. 'stockin' (see constants/permissionFeatures.js)
 * @param {'access'|'viewOwn'|'viewAll'|'create'|'update'|'delete'} action
 * @returns {boolean}
 */
export function hasFeaturePermission(user, role, featureKey, action) {
  if (role === 'admin') return true;
  const permission = user?.permissions?.find((p) => p.feature === featureKey);
  return !!permission?.[action];
}
