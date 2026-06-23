import { useEffect, useState } from 'react';
import { Search, Check, AlertTriangle } from 'lucide-react';
import permissionService from '../../../services/permissionService';
import { PERMISSION_FEATURES } from '../../../constants/permissionFeatures';
import { useSocketEvent } from '../../../context/SocketContext';

const TOGGLE_COLUMNS = [
  { field: 'access', label: 'Access' },
  { field: 'viewOwn', label: 'View Own' },
  { field: 'viewAll', label: 'View All' },
  { field: 'create', label: 'Create' },
  { field: 'update', label: 'Update' },
  { field: 'delete', label: 'Delete' },
];

const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    role="switch"
    aria-checked={checked}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
      checked ? 'bg-primary-600' : 'bg-gray-300'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-4' : 'translate-x-1'
      }`}
    />
  </button>
);

const PermissionAccessControl = () => {
  const [selectedFeature, setSelectedFeature] = useState(PERMISSION_FEATURES[0].key);
  const [featureCounts, setFeatureCounts] = useState({});
  const [matrix, setMatrix] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savingKey, setSavingKey] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadCounts();
  }, []);

  useEffect(() => {
    loadMatrix(selectedFeature);
  }, [selectedFeature]);

  const loadCounts = async () => {
    try {
      const counts = await permissionService.getFeatureAccessCounts();
      setFeatureCounts(counts || {});
    } catch (error) {
      console.error('Failed to load permission counts:', error);
    }
  };

  // Keep the matrix and counts in sync when any admin (or this tab) changes a permission.
  useSocketEvent('permission_updated', (data) => {
    if (data.feature === selectedFeature) {
      setMatrix(prev =>
        prev.map(row =>
          row.employee.id === data.employeeId ? { ...row, ...data } : row
        )
      );
    }
    if (data.access !== undefined) {
      loadCounts();
    }
  }, [selectedFeature]);

  const loadMatrix = async (feature) => {
    setIsLoading(true);
    try {
      const data = await permissionService.getMatrixForFeature(feature);
      setMatrix(data);
    } catch (error) {
      showNotification(`Failed to load permissions: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggle = async (employeeId, field, currentValue) => {
    const key = `${employeeId}-${field}`;
    const newValue = !currentValue;

    // Optimistic update
    setMatrix((prev) =>
      prev.map((row) =>
        row.employee.id === employeeId ? { ...row, [field]: newValue } : row
      )
    );
    setSavingKey(key);

    try {
      await permissionService.upsertPermission(employeeId, selectedFeature, { [field]: newValue });
      if (field === 'access') {
        await loadCounts();
      }
    } catch (error) {
      // Revert on failure
      setMatrix((prev) =>
        prev.map((row) =>
          row.employee.id === employeeId ? { ...row, [field]: currentValue } : row
        )
      );
      showNotification(`Failed to update permission: ${error.message}`, 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const filteredMatrix = matrix.filter((row) => {
    const name = `${row.employee.firstname || ''} ${row.employee.lastname || ''}`.toLowerCase();
    const email = (row.employee.email || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || email.includes(term);
  });

  const selectedFeatureLabel = PERMISSION_FEATURES.find((f) => f.key === selectedFeature)?.label || selectedFeature;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm ${
            notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}
        >
          {notification.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
          {notification.message}
        </div>
      )}

      {/* Features sidebar */}
      <div className="w-full lg:w-64 bg-white rounded-lg border border-gray-200 p-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Features</p>
        <div className="space-y-1">
          {PERMISSION_FEATURES.map((feature) => (
            <button
              key={feature.key}
              onClick={() => setSelectedFeature(feature.key)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedFeature === feature.key
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${selectedFeature === feature.key ? 'bg-primary-600' : 'bg-gray-300'}`} />
                {feature.label}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                {featureCounts[feature.key] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Matrix panel */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{selectedFeatureLabel}</h2>
            <p className="text-xs text-gray-500">Toggle access and individual permissions per employee</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-xs"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading...</div>
        ) : filteredMatrix.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No employees found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  {TOGGLE_COLUMNS.map((col) => (
                    <th key={col.field} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMatrix.map((row) => (
                  <tr key={row.employee.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-50 text-primary-700 font-semibold flex items-center justify-center text-xs">
                          {(row.employee.firstname?.[0] || '') + (row.employee.lastname?.[0] || '')}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {row.employee.firstname} {row.employee.lastname}
                          </div>
                          <div className="text-xs text-gray-500">{row.employee.email}</div>
                        </div>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            row.employee.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {row.employee.status}
                        </span>
                      </div>
                    </td>
                    {TOGGLE_COLUMNS.map((col) => (
                      <td key={col.field} className="px-4 py-3 whitespace-nowrap">
                        <ToggleSwitch
                          checked={!!row[col.field]}
                          disabled={savingKey === `${row.employee.id}-${col.field}`}
                          onChange={() => handleToggle(row.employee.id, col.field, row[col.field])}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionAccessControl;
