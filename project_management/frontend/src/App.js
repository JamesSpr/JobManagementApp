import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./hocs/Layout";
import RequireAuth from "./pages/login/RequireAuth";
import PersistLogin from "./pages/auth/PersistLogin";
import LoginPage from "./pages/login/Login";
import Activate from './pages/login/Activate';
import PasswordReset from "./pages/login/PasswordReset";
import HomePage from "./pages/home/Home";
import Approved from "./pages/job/Approved";
import EditJobPage from "./pages/job/EditJob";
import CreateJob from "./pages/job/CreateJob";
import Unauthorized from "./pages/auth/Unauthorized";
import Settings from "./pages/settings/Settings";
import Missing from "./pages/Missing";
import MyAccount from "./pages/auth/MyAccount";
import MyobActivate from "./pages/myob/Myob";
import Contractors from "./pages/contractors/Contractors";
import Invoices from "./pages/invoice/Invoices";
import Dashboard from "./pages/analytics/Dashboard";
import Bills from "./pages/bill/Bills";
import Wizard from "./pages/wizard/Wizard";
import WizQuote from "./pages/wizard/WizQuote";
import CompanyDashboard from "./pages/analytics/CompanyDashboard";
import CompanyAdmin from "./pages/admin/Company";
import Timesheets from "./pages/timesheets/Timesheets";

import ClientList from "./pages/clients/ClientList";
import Client from "./pages/clients/Client";
import EditBill from "./pages/bill/EditBill";

const App = () => {
    return ( 
        <Layout>
            <Routes>
                {/* <Route path="/" element={<Layout />}> */}
                    {/* Public Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    {/* <Route path="/signup" element={<Register />} /> */}
                    <Route path="/activate/:token" element={<Activate />} />
                    <Route path="/password-reset/:token" element={<PasswordReset />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />

                    {/* Protected Routes  */}
                    <Route element={<PersistLogin />}>
                        <Route element={<RequireAuth allowedRoles={['GUS', 'PMU', 'SMU', 'ADM', 'DEV']} />}>
                            <Route path="/" element={<HomePage />} />
                            <Route path="job/edit/:id" element={<EditJobPage />} />
                            {/* <Route path="job/approved/:input" element={<Approved />} /> */}
                            <Route path="job/create/:input" element={<CreateJob />} />
                            <Route path="clients" element={<ClientList />} />
                            <Route path="client/:client" element={<Client />} />
                            <Route path='myaccount' element={<MyAccount />} />
                            <Route path="myob" element={<MyobActivate />} />
                            <Route path="wizard" element={<Wizard />} />
                            <Route path="wizard/quote" element={<WizQuote />} />
                        </Route>

                        <Route element={<RequireAuth allowedRoles={['PMU', 'SMU', 'ADM', 'DEV']} />} >
                            <Route path="contractors" element={<Contractors />} />
                            <Route path="invoices" element={<Invoices />} />
                            <Route path="bills" element={<Bills />} />
                            <Route path="bills/:id" element={<EditBill />} />
                        </Route>

                        <Route element={<RequireAuth allowedRoles={['PMU', 'SMU', 'ADM', 'DEV']} />} >
                            <Route path="timesheets" element={<Timesheets />} />                            
                            <Route path="analytics" element={<Dashboard />} />
                            <Route path="timesheets/:endDate" element={<Timesheets />} />                            
                            <Route path="analytics" element={<Dashboard />} />
                            <Route path="admin" element={<CompanyAdmin />} />
                        </Route>

                        <Route element={<RequireAuth allowedRoles={['DEV']} />} >
                            <Route path="settings" element={<Settings />} />
                        </Route>
                    </Route>

                    {/* Catch all */}
                    <Route path="*" element={<Missing />}/>
                {/* </Route> */}
            </Routes>
        </Layout>
    );
}

export default App;