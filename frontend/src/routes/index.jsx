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
import StockOutManagment from "../page/dashboard/StockOutManagment";

import AdminProfile from "../page/dashboard/AdminProfile";
import EmployeeDashboard from "../page/dashboard/EmployeeDashboard";
import ProductViewPage from "../components/dashboard/product/ViewMorePage";
import SalesReportPage from "../page/dashboard/SalesReportPage";
import ViewStockoutReport from "../components/dashboard/salesReport/ViewStockoutReport";
import StockOutAnalysisPage from "../components/dashboard/salesReport/StockOutAnalysisPage";
import ReportManagement from "../page/dashboard/ReportManagment";
import ViewReportsPage from "../components/dashboard/report/ViewReportPage";
import EmployeeReportManagement from "../page/dashboard/EmployeeReportManagement";
import EmployeeReportViewMore from "../page/dashboard/EmployeeReportViewMore";
import ViewEmployeePage from "../components/dashboard/employee/ViewEmployeeModal";
import BackOrderDashboard from "../components/dashboard/salesReport/BackOrderOverview";
import TransactionAnalysis from "../components/dashboard/salesReport/TransactionAnalysis";
import TransactionAnalysisDetails from "../components/dashboard/salesReport/TransactionAnalysisDetails";
import SalesReturnManagement from "../page/dashboard/SalesReturnManagement";
import AboutPage from "../page/landing/AboutUs";
import FeaturesPage from "../page/landing/Feature";
import ContactPage from "../page/landing/ContactUs";
import LandingLayout from "../layout/LandingLayout";
import UpsertStockOutPage from "../components/dashboard/stockout/UpsertStockOutPage";
import UpsertSalesReturnPage from "../components/dashboard/salesReturn/UpsertSalesReturnPage";
import UpsertStockInPage from "../components/dashboard/stockin/UpsertStockinPage";
import PartnerManagement from "../page/dashboard/PartnerManagement";
import PartnerLogin from "../page/auth/partner/PartnerLogin";
import ProtectPrivatePartner from "../components/protectors/partner/ProtectPrivatePartner";
import PartnerDashboardHome from "../page/dashboard/partner/PartnerDashboardHome";
import PartnerProfilePage from "../page/dashboard/partner/PartnerProfilePage";
import PartnerDashboardLayout from "../layout/PartnerLayout";

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
                path: "/",
                element: <LandingLayout />,
                children: [
                    {
                        path: "/",
                        element: <LandingPage />
                    },
                    {
                        path: 'about',
                        element: <AboutPage />
                    },
                    {
                        path: 'features',
                        element: <FeaturesPage />
                    },
                    {
                        path: 'contact',
                        element: <ContactPage />
                    },
                ]
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
                                        <EmployeeManagement role={'admin'} />
                                    </SuspenseWrapper>
                                )
                            },
                            {
                                path: "position",
                                element: (
                                    <SuspenseWrapper>
                                        <TaskManagement role={'admin'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "category",
                                element: (
                                    <SuspenseWrapper>
                                        <CategoryManagement role={'admin'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "product",
                                element: (
                                    <SuspenseWrapper>
                                        <ProductManagement role={'admin'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "product/:id",
                                element: (
                                    <SuspenseWrapper>
                                        <ProductViewPage role={'admin'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "stockin",
                                element: (
                                    <SuspenseWrapper>
                                        <StockInManagement role={'admin'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "stockin/create",
                                element: (
                                    <SuspenseWrapper>
                                        <UpsertStockInPage role={'admin'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "stockin/update/:id",
                                element: (
                                    <SuspenseWrapper>
                                        <UpsertStockInPage role={'admin'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "stockout",
                                element: (
                                    <SuspenseWrapper>
                                        <StockOutManagment role={'admin'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "stockout/create",
                                element: (
                                    <SuspenseWrapper>
                                        <UpsertStockOutPage role={'admin'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "stockout/update/:id",
                                element: (
                                    <SuspenseWrapper>
                                        <UpsertStockOutPage role={'admin'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "sales-return",
                                element: (
                                    <SuspenseWrapper>
                                        <SalesReturnManagement role={'admin'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "sales-return/create",
                                element: (
                                    <SuspenseWrapper>
                                        <UpsertSalesReturnPage role={'admin'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "profile",
                                element: (
                                    <SuspenseWrapper>
                                        <AdminProfile role={'admin'} />
                                    </SuspenseWrapper>
                                )
                            },
                            {
                                path: "sales-report",
                                element: (
                                    <SuspenseWrapper>
                                        <SalesReportPage role={'admin'} />
                                    </SuspenseWrapper>
                                )
                            },
                            {
                                path: "sales-report/stockout/:id",
                                element: (
                                    <SuspenseWrapper>
                                        <ViewStockoutReport role={'admin'} />
                                    </SuspenseWrapper>
                                )
                            },
                            {
                                path: "sales-report/stockout-analysis",
                                element: (
                                    <SuspenseWrapper>
                                        <StockOutAnalysisPage role={'admin'} />
                                    </SuspenseWrapper>
                                )
                            },
                            {
                                path: "sales-report/non-stock-analysis",
                                element: (
                                    <SuspenseWrapper>
                                        <BackOrderDashboard role={'admin'} />
                                    </SuspenseWrapper>
                                )
                            },
                            {
                                path: "sales-report/transaction-analysis",
                                element: (
                                    <SuspenseWrapper>
                                        <TransactionAnalysis role={'admin'} />
                                    </SuspenseWrapper>
                                )
                            },
                            {
                                path: "sales-report/transaction-analysis/:id",
                                element: (
                                    <SuspenseWrapper>
                                        <TransactionAnalysisDetails role={'admin'} />
                                    </SuspenseWrapper>
                                )
                            },
                            {
                                path: "employee-report",
                                element: (
                                    <SuspenseWrapper>
                                        <EmployeeReportManagement role={'admin'} />
                                    </SuspenseWrapper>
                                )
                            },
                            {
                                path: "employee/:id",
                                element: (
                                    <SuspenseWrapper>
                                        <ViewEmployeePage role={'admin'} />
                                    </SuspenseWrapper>
                                )
                            },
                            {
                                path: "employee-report/:id",
                                element: (
                                    <SuspenseWrapper>
                                        <EmployeeReportViewMore role={'admin'} />
                                    </SuspenseWrapper>
                                )
                            },
                            {
                                path: "partner",
                                element: (
                                    <SuspenseWrapper>
                                        <PartnerManagement role={'admin'} />
                                    </SuspenseWrapper>
                                )

                            },
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
                        path: "dashboard",
                        element: <DashboardLayout role={'employee'} />,
                        children: [
                            {
                                index: true,
                                element: (
                                    <SuspenseWrapper>
                                        <EmployeeDashboard />
                                    </SuspenseWrapper>
                                )
                            },

                            {
                                path: 'profile',
                                element: <SuspenseWrapper> <EmployeeProfile /> </SuspenseWrapper>
                            },

                            {
                                path: "sales-return",
                                element: (
                                    <SuspenseWrapper>
                                        <SalesReturnManagement role={'employee'} />
                                    </SuspenseWrapper>
                                )

                            },

                            {
                                path: "sales-return",
                                element: (
                                    <SuspenseWrapper>
                                        <SalesReturnManagement role={'employee'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "sales-return/create",
                                element: (
                                    <SuspenseWrapper>
                                        <UpsertSalesReturnPage role={'employee'} />
                                    </SuspenseWrapper>
                                )

                            },

                            {
                                path: "stockin",
                                element: (
                                    <SuspenseWrapper>
                                        <StockInManagement role={'employee'} />
                                    </SuspenseWrapper>
                                )

                            },

                            {
                                path: "stockin/create",
                                element: (
                                    <SuspenseWrapper>
                                        <UpsertStockInPage role={'employee'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "stockin/update/:id",
                                element: (
                                    <SuspenseWrapper>
                                        <UpsertStockInPage role={'employee'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "sales-report",
                                element: (
                                    <SuspenseWrapper>
                                        <SalesReportPage role={'employee'} />
                                    </SuspenseWrapper>
                                )
                            },
                            {
                                path: "sales-report/stockout/:id",
                                element: (
                                    <SuspenseWrapper>
                                        <ViewStockoutReport role={'employee'} />
                                    </SuspenseWrapper>
                                )
                            },
                            {
                                path: "sales-report/stockout-analysis",
                                element: (
                                    <SuspenseWrapper>
                                        <StockOutAnalysisPage role={'employee'} />
                                    </SuspenseWrapper>
                                )
                            },
                            {
                                path: "sales-report/non-stock-analysis",
                                element: (
                                    <SuspenseWrapper>
                                        <BackOrderDashboard role={'employee'} />
                                    </SuspenseWrapper>
                                )
                            },
                            {
                                path: "sales-report/transaction-analysis",
                                element: (
                                    <SuspenseWrapper>
                                        <TransactionAnalysis role={'employee'} />
                                    </SuspenseWrapper>
                                )
                            },
                            {
                                path: "sales-report/transaction-analysis/:id",
                                element: (
                                    <SuspenseWrapper>
                                        <TransactionAnalysisDetails role={'employee'} />
                                    </SuspenseWrapper>
                                )
                            },
                            {
                                path: "category",
                                element: (
                                    <SuspenseWrapper>
                                        <CategoryManagement role={'employee'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "product",
                                element: (
                                    <SuspenseWrapper>
                                        <ProductManagement role={'employee'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "product/:id",
                                element: (
                                    <SuspenseWrapper>
                                        <ProductViewPage role={'employee'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "report/:id",
                                element: (
                                    <SuspenseWrapper>
                                        <ViewReportsPage role={'employee'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "stockout",
                                element: (
                                    <SuspenseWrapper>
                                        <StockOutManagment role={'employee'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "stockout/create",
                                element: (
                                    <SuspenseWrapper>
                                        <UpsertStockOutPage role={'employee'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "stockout/update/:id",
                                element: (
                                    <SuspenseWrapper>
                                        <UpsertStockOutPage role={'employee'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "sales-return",
                                element: (
                                    <SuspenseWrapper>
                                        <SalesReturnManagement role={'employee'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "sales-return/create",
                                element: (
                                    <SuspenseWrapper>
                                        <SalesReturnManagement role={'employee'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "report",
                                element: (
                                    <SuspenseWrapper>
                                        <ReportManagement role={'employee'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "partner",
                                element: (
                                    <SuspenseWrapper>
                                        <PartnerManagement role={'employee'} />
                                    </SuspenseWrapper>
                                )

                            },


                        ]
                    }
                ],


            },
            {
                path: 'partner',
                element: <ProtectPrivatePartner><Outlet context={{ role: 'partner' }} /></ProtectPrivatePartner>,
                children: [
                    {
                        index: true,
                        element: <Navigate to={'/partner/dashboard'} replace />
                    },
                    {
                        path: "dashboard",
                        element: <PartnerDashboardLayout role={'partner'} />,
                        children: [
                            {
                                index: true,
                                element: (
                                    <SuspenseWrapper>
                                        <PartnerDashboardHome role={'partner'} />
                                    </SuspenseWrapper>
                                )

                            },
                            {
                                path: "profile",
                                element: (
                                    <SuspenseWrapper>
                                        <PartnerProfilePage role={'partner'} />
                                    </SuspenseWrapper>
                                )

                            }
                        ]
                    },

                ]
            }
        ]
    },

    {
        path: '/auth',
        element: <AuthLayout />,
        children: [
            {
                index: true,
                element: <SuspenseWrapper><AuthSelectionPage /> </SuspenseWrapper>
            },
            {
                path: 'partner',
                element: <Navigate to={'/auth/partner/login'} replace />
            },
            {
                path: 'partner/login',
                element: <PartnerLogin />
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