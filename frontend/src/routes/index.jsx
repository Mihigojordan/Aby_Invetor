import { Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import Dashboard from "../page/dashboard/Dashboard";
import LoginPage from "../page/auth/Login";
import AdminDashboardLayout from "../layout/AdminDashboardLayout";
import AuthLayout from "../layout/AuthLayout";
import EmployeeManagement from "../page/dashboard/EmployeeManagement";

import TaskManagement from "../page/dashboard/TaskManagement";
import MainLayout from "../context/MainLayout";
import ProtectPrivateAdmin from "../components/protectors/admin/ProtectPrivateAdmin";
import UnlockScreen from "../page/auth/UnlockScreen";
import NotFoundPage from "../page/landing/NotFound";
import LandingPage from "../page/landing/Home";
import CategoryManagement from "../page/dashboard/CategoryManagement";

const SuspenseWrapper = ({ children }) => {
    return <Suspense fallback={'loading...'}>{children}</Suspense>
}

const routes = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout />,
        children: [
            {
                index:true,
                element: <LandingPage /> 
            },
            {
                path: "admin",
                element: <ProtectPrivateAdmin> <MainLayout /> </ProtectPrivateAdmin>,
                children: [
                    {
                        index:true,
                        element:<Navigate to={'/admin/dashboard'} replace />
                    },
                    {
                        path: "dashboard",
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
                                path: 'employee',
                                element: (
                                    <SuspenseWrapper>
                                        <EmployeeManagement />
                                    </SuspenseWrapper>
                                )
                            },
                            {
                                path: "position",
                                element: (
                                    <SuspenseWrapper>
                                        <TaskManagement />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "category",
                                element: (
                                    <SuspenseWrapper>
                                        <CategoryManagement />
                                    </SuspenseWrapper>
                                )

                            }
                        ]
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
                path: 'admin/login',
                element: (
                    <SuspenseWrapper>
                        <LoginPage />
                    </SuspenseWrapper>
                )
            },
            {
                path:'admin/unlock',
                element:(
                    <SuspenseWrapper>
                        <UnlockScreen />
                    </SuspenseWrapper>
                )
            }
        ],
        
    },
    {
        path:'*',
        element: <NotFoundPage />
    }
]
)
export default routes