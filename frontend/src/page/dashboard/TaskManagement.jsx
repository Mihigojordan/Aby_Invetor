import React from 'react';
import { Shield } from 'lucide-react';
import PermissionAccessControl from '../../components/dashboard/permission/PermissionAccessControl';

const TaskManagement = () => {
    return (
        <div className="bg-gray-50 p-4 h-[90vh] sm:p-6 lg:p-8">
            <div className="h-full overflow-y-auto mx-auto">
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary-600 rounded-lg">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Permission Management</h1>
                    </div>
                    <p className="text-sm text-gray-600">Toggle access and individual permissions per employee</p>
                </div>

                <PermissionAccessControl />
            </div>
        </div>
    );
};

export default TaskManagement;
