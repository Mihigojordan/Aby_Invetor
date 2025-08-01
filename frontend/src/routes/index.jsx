import { Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import Dashboard from "../page/dashboard/Dashboard";
import LoginPage from "../page/auth/admin/Login";
import DashboardLayout from "../layout/DashboardLayout";
import AuthLayout from "../layout/AuthLayout";
import EmployeeManagement from "../page/dashboard/EmployeeManagement";

import TaskManagement from "../page/dashboard/TaskManagement";
import MainLayout from "../layout/MainLayout";
import ProtectPrivateAdmin from "../components/protectors/admin/ProtectPrivateAdmin";
import UnlockScreen from "../page/auth/admin/UnlockScreen";
import NotFoundPage from "../page/landing/NotFound";
import LandingPage from "../page/landing/Home";
import CategoryManagement from "../page/dashboard/CategoryManagement";
import ProductManagement from "../page/dashboard/ProductManagement";
import StockInManagement from "../page/dashboard/StockInManagement";
import AdminAuthLayout from "../layout/Admin/AdminAuthLayout";
import EmployeeAuthLayout from "../layout/employee/EmployeeAuthLayout";
import EmployeeLoginPage from "../page/auth/employee/EmployeeLoginPage";
import EmployeeUnlockScreen from "../page/auth/employee/EmployeeUnlockScreen";
import AuthSelectionPage from "../page/auth/AuthSelectionPage";
import ProtectPrivateEmployee from "../components/protectors/employee/ProtectPrivateAdmin";
import EmployeeProfile from "../page/dashboard/EmployeeProfileManagement";

// eslint-disable-next-line react-refresh/only-export-components
const SuspenseWrapper = ({ children }) => {
    return <Suspense fallback={'loading...'}>{children}</Suspense>
}

const routes = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout />,
        children: [
            {
                index: true,
                element: <LandingPage />
            },
            {
                path: "admin",
                element: <ProtectPrivateAdmin> <MainLayout /> </ProtectPrivateAdmin>,
                children: [
                    {
                        index: true,
                        element: <Navigate to={'/admin/dashboard'} replace />
                    },
                    {
                        path: "dashboard",
                        element: <DashboardLayout role={'admin'} />,
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

                            },
                            {
                                path: "product",
                                element: (
                                    <SuspenseWrapper>
                                        <ProductManagement />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "stockin",
                                element: (
                                    <SuspenseWrapper>
                                        <StockInManagement />
                                    </SuspenseWrapper>
                                )

                            }
                        ]
                    }
                ]

            },
            {
                path: "employee",
                element: <ProtectPrivateEmployee> <MainLayout /> </ProtectPrivateEmployee>,
                children: [
                    {
                        index: true,
                        element: <Navigate to={'/employee/dashboard'} replace />
                    },
                    {
                        path:'profile',
                        element: <SuspenseWrapper> <EmployeeProfile /> </SuspenseWrapper>
                    },
                    {
                        path: "dashboard",
                        element: <DashboardLayout role={'employee'} />,
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
                                path: "stockin",
                                element: (
                                    <SuspenseWrapper>
                                        <StockInManagement />
                                    </SuspenseWrapper>
                                )

                            }
                        ]
                    }
                ]

            },
        ]
    },
    {
        path: '/auth',
        element: <AuthLayout />,
        children: [
            {
                index:true,
                element: <SuspenseWrapper><AuthSelectionPage /> </SuspenseWrapper>
            },
            {
                path: 'admin',
                element: <AdminAuthLayout />,
                children: [
                    {
                        path: 'login',
                        element: (
                            <SuspenseWrapper>
                                <LoginPage />
                            </SuspenseWrapper>
                        )
                    },
                    {
                        path: 'unlock',
                        element: (
                            <SuspenseWrapper>
                                <UnlockScreen />
                            </SuspenseWrapper>
                        )
                    }
                ],

            },
            {
                path: 'employee',
                element: <EmployeeAuthLayout />,
                children: [
                    {
                        path: 'login',
                        element: (
                            <SuspenseWrapper>
                                <EmployeeLoginPage />
                            </SuspenseWrapper>
                        )
                    },
                    {
                        path: 'unlock',
                        element: (
                            <SuspenseWrapper>
                                <EmployeeUnlockScreen />
                            </SuspenseWrapper>
                        )
                    }
                ],

            },
        ],

    },
    {
        path: '*',
        element: <NotFoundPage />
    }
]
)
export default routes