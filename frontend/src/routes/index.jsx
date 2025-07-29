import { Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import Dashboard from "../page/dashboard/Dashboard";
import LoginPage from "../page/Login";
import AdminDashboardLayout from "../layout/AdminDashboardLayout";
import AuthLayout from "../layout/AuthLayout";
import EmployeeManagement from "../page/dashboard/EmployeeManagement";

import TaskManagement from "../page/dashboard/TaskManagement";

const SuspenseWrapper = ({ children }) => {
    return <Suspense fallback={'loading...'}>{children}</Suspense>
}

const routes = createBrowserRouter([
    {
        path: '/dashboard',
        element: <Outlet />,
        children: [
            {
                path: "admin",
                element: <AdminDashboardLayout />,
                children: [
                    {
                        index: true,
                        element: (
                            <SuspenseWrapper>
                                <Dashboard />
                            </SuspenseWrapper>
                        )
                    },
                    {
                        path:'employee',
                        element: (
                            <SuspenseWrapper>
                                <EmployeeManagement />
                            </SuspenseWrapper>
                        )
                    },
                    {
                        path:"position",
                        element:(
                            <SuspenseWrapper>
                                <TaskManagement />
                            </SuspenseWrapper>
                        )

                    }
                ]
            }
        ]
    },
    {
        path: '/auth',
        element: <AuthLayout />,
        children: [
            {
                path: 'login',
                element: (
                    <SuspenseWrapper>
                        <LoginPage />
                    </SuspenseWrapper>
                )
            }
        ]
    }
]
)
export default routes