import React, { useState, useEffect }  from 'react';
import { axiosPrivate } from '../../hooks/axios';
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Grid, Typography,} from '@mui/material';
import useAuth from '../auth/useAuth';
import { InputField, ProgressButton } from '../../components/Components';

const MyobActivate = () => {

    const { auth, setAuth } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const code = searchParams.get('code');
    const navigate = useNavigate();

    const [queries, setQueries] = useState({customer: "CompanyName eq 'BGIS'", contractor: "CompanyName eq 'Buildlogic Pty Ltd'", 
                                            bill: "Number eq '00006510'", order: "Number eq '00001570'", invoice: "Number eq '00001481'",
                                             job: "Number eq 'PO8172189'", timesheet: "Employee/Name eq 'James Sprague'", custom: "Payroll/PayrollCategory/Wage",
                                             contractorName: "", contractorABN: "", clientName: "",});

    const [fields, setFields] = useState({invoice: ""})
    const [waiting, setWaiting] = useState({getJobs: false, getCustomer: false, getgeneralJournal: false, getAccounts: false,})

    if(code) {
        useEffect(() => {
            const controller = new AbortController();

            const fetchData = async () => {
                await axiosPrivate({
                    method: 'post',
                    signal: controller.signal,
                    data: JSON.stringify({
                        query: `mutation myobGetAccessToken($code:String!) {
                            myob_get_access_token: myobGetAccessToken(code:$code) {
                                success
                                response
                            }
                        }`,
                        variables: {
                            code: code,
                        },
                    })
                }).then((response) => {
                    console.log("MYOB Access Token", response.data);
                    const res = response.data?.data?.myob_get_access_token;
    
                    if(res.success) {
                        const token = JSON.parse(res.response);
                        // console.log('access_token:', token)
                        axiosPrivate({
                            method: 'post',
                            data: JSON.stringify({
                                query: `mutation updateOrCreateMyobAccount($accessToken:String!, $expiresIn:String!, $refreshToken:String!, $uid:String!, $username:String!, $userId:String!) {
                                    update_or_create_myob_account: updateOrCreateMyobAccount(accessToken:$accessToken, expiresIn:$expiresIn, refreshToken:$refreshToken, uid:$uid, username:$username, userId:$userId) {
                                        success
                                        message
                                    } 
                                }`,
                                variables: {
                                    accessToken: token.access_token,
                                    expiresIn: token.expires_in,
                                    refreshToken: token.refresh_token,
                                    uid: token.user.uid,
                                    username: token.user.username,
                                    userId: auth?.user?.id,
                                },
                            })
                        }).then(response => {
                            console.log("MYOB User Account", response)
                            const res = response?.data?.data?.update_or_create_myob_account;
                            // console.log(res);
                            if(res.success){
                                setAuth(prev => ({...prev, 'myob': {'id': token.user.uid}}))
                            }
                        })
                    }
                    else {
                        console.log("error!");
                    }
                }).catch((err) => {
                    // TODO: handle error
                    if(err.name === "CanceledError") {
                        return
                    }
                    console.log("Error:", err);
                });
            }

            fetchData();
        
            return () => {
                controller.abort();
            } 
        }, [])
    }

    const testRefresh = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobRefreshToken($uid:String!) {
                    myob_refresh_token: myobRefreshToken(uid:$uid) {
                        success
                        message
                    } 
                }`,
                variables: {
                    uid: auth?.myob?.id,
                },
            })
        }).then((response) => {
            // console.log("success", response.data);
            const res = response.data?.data?.myob_refresh_token;
            if(res.success) {
                const token = JSON.parse(res.message);
                console.log('RT', token);
                console.log('auth', auth);
                axiosPrivate({
                    method: 'post',
                    data: JSON.stringify({
                        query: `mutation updateOrCreateMyobAccount($accessToken:String!, $expiresIn:String!, $refreshToken:String!, $uid:String!, $userId:String!) {
                            update_or_create_myob_account: updateOrCreateMyobAccount(accessToken:$accessToken, expiresIn:$expiresIn, refreshToken:$refreshToken, uid:$uid, userId:$userId) {
                                success
                                message
                                user {
                                    id
                                    accessToken
                                    refreshToken
                                }
                            } 
                        }`,
                        variables: {
                            accessToken: token.access_token,
                            expiresIn: token.expires_in,
                            refreshToken: token.refresh_token,
                            uid: auth?.myob?.id,
                            userId: auth?.user?.pk,
                        },
                    })
                }).then(response => {
                    console.log("response", response)
                    const res = response?.data?.data?.update_or_create_myob_account;
                    // console.log(res);
                })
            }
            else {
                console.log("error!");
            }
        })
    }

    const getAccounts = async () => {
        setWaiting(prev => ({...prev, getAccounts: true}))
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation getAccounts {
                    accounts: getAccounts {
                        success
                        message
                    }
                }`,
                variables: {}
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.accounts;
            if(res.success) {
                // console.log(res.message)
                console.log("Accounts:", JSON.parse(res.message))
            }
            else {
                console.log("Error:", JSON.parse(res.message) ?? "");
            }
        }).finally(() => {
            setWaiting(prev => ({...prev, getAccounts: false}))
        })
    }

    const getTaxCodes = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobGetTaxCodes($uid:String!) {
                    myob_get_tax_codes: myobGetTaxCodes(uid:$uid) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.myob_get_tax_codes;
            if(res.success) {
                // console.log(res.message)
                const taxCodes = JSON.parse(res.message);
                console.log("Tax Codes:", taxCodes)
            }
            else {
                console.log("error!", JSON.parse(res.message) ?? "");
            }
        })
    }

    const getGeneralJournal = async () => {
        setWaiting(prev => ({...prev, generalJournal: true}))
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation getGeneralJournal() {
                    generalJournal: getGeneralJournal() {
                        success
                        message
                        generalJournal
                    }
                }`,
                variables: {}
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.generalJournal;
            if(res.success) {
                console.log("General Journal:", JSON.parse(res.generalJournal))
            }
            else {
                console.log("Error:", res.message);
            }
        }).finally(()  => {
            setWaiting(prev => ({...prev, generalJournal: false}))
        })
    }

    const getCustomer = async () => {
        setWaiting(prev => ({...prev, getCustomer: true}));
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation getCustomers($filter:String!) {
                    customers: getCustomers(filter:$filter) {
                        success
                        message
                        customers
                    } 
                }`,
                variables: {
                    filter: queries?.customer,
                },
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.customers;

            if(res.success) {
                console.log("Customer:", JSON.parse(res.customers))
            }
            else {
                console.log("Error:", res.message);
            }
        }).finally(() => {
            setWaiting(prev => ({...prev, getCustomer: false}));
        })
    }

    const getInvoice = async () => {
        const asPdf = false;

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobGetInvoices($uid:String!, $inv:String!) {
                    myob_get_invoices: myobGetInvoices(uid:$uid, inv:$inv) {
                        success
                        message
                    } 
                }`,
                variables: {
                    uid: auth?.myob?.id,
                    inv: queries.invoice,
                },
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.myob_get_invoices;
            if(res.success) {
                if(asPdf) {
                    const invoice = JSON.parse(res.message);
                    console.log("PDF CREATED", invoice);
                }
                else {
                    const invoices = JSON.parse(res.message);
                    console.log("Invoices:", invoices)
                }
            }
            else {
                console.log("error!", res.message );
            }
        })
    }
    
    const getOrder = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobGetOrders($uid:String!, $query:String!) {
                    orders: myobGetOrders(uid:$uid, query:$query) {
                        success
                        message
                    } 
                }`,
                variables: {
                    uid: auth?.myob?.id,
                    query: queries.order,
                },
            })
        }).then((response) => {
            // console.log("Orders Response:", response);
            const res = response.data?.data?.orders;
            if(res.success) {
                const orders = JSON.parse(res.message);
                console.log("Orders:", orders);
            }
            else {
                console.log("error!", res.message, res.error);
            }
        })
    }
    
    const getBill = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobGetBills($uid:String!, $bill:String!) {
                    myob_get_bills: myobGetBills(uid:$uid, bill:$bill) {
                        success
                        message
                    } 
                }`,
                variables: {
                    uid: auth?.myob?.id,
                    bill: queries.bill,
                },
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.myob_get_bills;
            if(res.success) {
                const bill = JSON.parse(res.message);
                console.log("Bills:", bill)
            }
            else {
                console.log("error!", res.message );
            }
        })
    }

    const getTimesheet = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation GetTimesheets($timesheet:String!) {
                    timesheets: GetTimesheets(timesheet:$timesheet) {
                        success
                        message
                    } 
                }`,
                variables: {
                    timesheet: queries.timesheet,
                },
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.timesheets;
            if(res.success) {
                const bill = JSON.parse(res.message);
                console.log("Timesheets:", bill)
            }
            else {
                console.log("error!", res.message );
            }
        })
    }
   
    const customQuery = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobCustomQuery($uid:String!, $query:String!) {
                    response: myobCustomQuery(uid:$uid, query:$query) {
                        success
                        message
                    } 
                }`,
                variables: {
                    uid: auth?.myob?.id,
                    query: queries.custom,
                },
            })
        }).then((response) => {
            const res = response.data?.data?.response;
            if(res.success) {
                const query = JSON.parse(res.message);
                console.log("Query:", query)
            }
            else {
                console.log("error!", res.message );
            }
        })
    }

    const getJobs = async () => {
        setWaiting(prev => ({...prev, getJobs: true}))
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation getMyobJobs($filter:String!) {
                    jobs: getMyobJobs(filter:$filter) {
                        success
                        message
                        jobs
                    }
                }`,
                variables: {
                    filter: queries.job,
                }
            })
        }).then((response) => {
            const res = response.data?.data?.jobs;
            if(res.success) {
                console.log("Jobs:", JSON.parse(res.jobs))
            }
            else {
                console.log("Error:", JSON.parse(res.message) ?? "");
            }
        }).finally(() => {
            setWaiting(prev => ({...prev, getJobs: false}))
        })
    }

    const getContractors = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobGetSupplier($filter:String!) {
                    myob_get_contractors: myobGetSupplier(filter:$filter) {
                        success
                        message
                    }
                }`,
                variables: {
                    filter: queries.contractor,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.myob_get_contractors;
            if(res.success) {
                const contractors = JSON.parse(res.message);
                console.log("Contractors:", contractors)
            }
            else {
                console.log("error!", JSON.parse(res.message) ?? "");
            }
        })
    }

    const syncClients = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobSyncClients($uid:String!) {
                    myob_sync_clients: myobSyncClients(uid:$uid) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.myob_sync_clients;
            if(res.success) {
                // console.log(res.message)`
                const clients = JSON.parse(res.message);
                console.log("Clients:", clients)
            }
            else {
                console.log("error!", JSON.parse(res.message) ?? "");
            }
        })
    }
    
    const syncContractors = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobSyncContractors($uid:String!) {
                    myob_sync_contractors: myobSyncContractors(uid:$uid) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.myob_sync_contractors;
            if(res.success) {
                // console.log(res.message)
                const contractors = JSON.parse(res.message);
                console.log("Contractors:", contractors)
            }
            else {
                console.log("error!", JSON.parse(res.message) ?? "");
            }
        })
    }
    
    const syncJobs = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobSyncJobs($uid:String!) {
                    myob_sync_jobs: myobSyncJobs(uid:$uid) {
                        success
                        message
                        errors
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.myob_sync_jobs;
            if(res.success) {
                // console.log(res.message)
                console.log("Jobs:", JSON.parse(res.message), "Errors:", JSON.parse(res.errors));
            }
            else {
                console.log("error!", JSON.parse(res.message) ?? "");
            }
        })
    }

    const syncInvoices = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobSyncInvoices($uid:String!) {
                    myob_sync_invoices: myobSyncInvoices(uid:$uid) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.myob_sync_invoices;
            if(res.success) {
                // console.log(res.message)
                const invoices = JSON.parse(res.message);
                console.log("Invoices:", invoices)
            }
            else {
                console.log("error!", JSON.parse(res.message) ?? "");
            }
        })
    }

    const syncBills = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobSyncBills($uid:String!) {
                    myob_sync_bills: myobSyncBills(uid:$uid) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.myob_sync_bills;
            if(res.success) {
                // console.log(res.message)
                const bills = JSON.parse(res.message);
                console.log("Bills:", bills)
            }
            else {
                console.log("error!", JSON.parse(res.message) ?? "");
            }
        })
    }
    
    const syncRemittance = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobSyncRemittance($uid:String!) {
                    remittance: myobSyncRemittance(uid:$uid) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.remittance;
            if(res.success) {
                // console.log(res.message)
                const remittance = JSON.parse(res.message);
                console.log("Remittance:", remittance)
            }
            else {
                console.log("error!", JSON.parse(res.message) ?? "");
            }
        })
    }

    const importContractorsFromBills = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobImportContractorsFromBills($uid:String!) {
                    myob_import_contractors_from_bills: myobImportContractorsFromBills(uid:$uid) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.myob_import_contractors_from_bills;
            if(res.success) {
                // console.log(res.message)
                const contractors = JSON.parse(res.message);
                console.log("Contractors:", contractors)
            }
            else {
                console.log("error!", JSON.parse(res.message) ?? "");
            }
        })
    }

    const importClientFromABN = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobImportClientFromAbn($uid:String!, $name:String!) {
                    client: myobImportClientFromAbn(uid:$uid, name:$name) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                    name: queries.clientName,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.client;
            if(res.success) {
                // console.log(res.message)
                const clients = JSON.parse(res.message);
                console.log("Clients:", clients)
            }
            else {
                console.log("error!", JSON.parse(res.message) ?? "");
            }
        })
    }
    
    const importContractorFromABN = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobImportContractorFromAbn($uid:String!, $name:String!, $abn:String!) {
                    contractor: myobImportContractorFromAbn(uid:$uid, name:$name, abn:$abn) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                    name: queries.contractorName,
                    abn: queries.contractorABN
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.contractor;
            if(res.success) {
                // console.log(res.message)
                // const contractors = JSON.parse(res.message);
                console.log("Contractors:", res.message)
            }
            else {
                console.log("error!", res.message ?? "");
            }
        })
    }
    
    const importBGISInvoices = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobImportBgisInvoices($uid:String!) {
                    myob_import_bgis_invoices: myobImportBgisInvoices(uid:$uid) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.myob_import_bgis_invoices;
            if(res.success) {
                // console.log(res.message)
                const invoices = JSON.parse(res.message);
                console.log("Invoices:", invoices)
            }
            else {
                console.log("error!", JSON.parse(res.message) ?? "");
            }
        })
    }
    
    const customFunction = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobCustomFunction($uid:String!) {
                    custom: myobCustomFunction(uid:$uid) {
                        success
                        message
                        obj
                        items
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                }
            })
        }).then((response) => {
            console.log(response);
            // const res = response.data?.data?.custom;
            if(res.success) {
                console.log(res.message, JSON.parse(res?.obj))
                // const items = JSON.stringify(res.items);
                // const item = JSON.parse(items);
                // let data = []
                // for(var i=0; i<item.length;i++) {
                //     var x = item[i].replaceAll("'", '"').replaceAll("None", 'null').replaceAll("True", '"True"').replaceAll("False", '"False"')
                //     data.push(JSON.parse(x))
                // }
                // console.log("Items:", data);
            }
            else {
                console.log("Error:", res.message);
            }
        })
    }

    const createInvoice = async () => {
        // await axiosPrivate({
        //     method: 'post',
        //     data: JSON.stringify({
        //         query: `mutation myobCreateInvoice($uid:String!, $job:String!) {
        //             myob_create_invoice: myobCreateInvoice(uid:$uid, job:$job) {
        //                 success
        //                 message
        //             }
        //         }`,
        //         variables: {
        //             uid: auth?.myob?.id,
        //             job: fields.invoice,
        //         }
        //     })
        // }).then((response) => {
        //     // console.log("success", response);
        //     const res = response.data?.data?.myob_create_invoice;
        //     if(res.success) {
        //         // console.log(res.message)
        //         const invoice = JSON.parse(res.message);
        //         console.log("Invoice Created:", invoice)
        //     }
        //     else {
        //         console.log("Error:", res.message);
        //     }
        // })
    }

    const generateInvoice = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation generateInvoice($uid:String!, $job:String!) {
                    generate_invoice: generateInvoice(uid:$uid, job:$job) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                    job: fields.invoice,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.generate_invoice;
            if(res.success) {
                // console.log(res.message)
                const invoice = JSON.parse(res.message);
                console.log("Invoice Created:", invoice)
            }
            else {
                console.log("Error:", res.message);
            }
        })
    }
    
    return (
        <>
            {auth?.user?.role === "DEV" ?
                <Grid container spacing={2} 
                alignItems="center" 
                justifyContent="center"
                alignContent="center"
                textAlign="center"
                direction="column">
                    <Grid item xs={12}>
                        <Typography variant="h6">MYOB Authentication</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Button style={{width: '200px', margin: 'auto 5px', padding: '2px'}} variant='outlined' onClick={testRefresh}>Refresh</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h6">MYOB Requests</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <ProgressButton name="Get Accounts" buttonVariant='outlined' onClick={getAccounts} waiting={waiting.getAccounts} />
                        <Button style={{width: '150px', margin: 'auto 5px', padding: '2px'}} variant='outlined' onClick={getTaxCodes}>Get Tax Codes</Button>
                        <ProgressButton name='Get General Journal' buttonVariant='outlined' onClick={getGeneralJournal} waiting={waiting.getGeneralJournal} />
                        <Button style={{width: '180px', margin: 'auto 5px', padding: '2px'}} variant='outlined' onClick={customFunction}>Custom Function</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField width={500} label="Job Filter" value={queries.job} onChange={(e) => setQueries(prev => ({...prev, job: e.target.value}))}/>
                        <ProgressButton  name='Get Jobs' buttonVariant='outlined' onClick={getJobs} waiting={waiting.getJobs}/>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField width={500} label="Customer Filter" value={queries.customer} onChange={(e) => setQueries(prev => ({...prev, customer: e.target.value}))}/>
                        <ProgressButton name='Get Customer' buttonVariant='outlined' onClick={getCustomer} waiting={waiting.getCustomer}/>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField width={500} label="Contractor Filter" value={queries.contractor} onChange={(e) => setQueries(prev => ({...prev, contractor: e.target.value}))}/>
                        <Button style={{width: '180px', margin: 'auto 10px', padding: '2px'}} variant='outlined' onClick={getContractors}>Get Contractors</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField width={500} label="Orders Filter" value={queries.order} onChange={(e) => setQueries(prev => ({...prev, order: e.target.value}))}/>
                        <Button style={{width: '180px', margin: 'auto 10px', padding: '2px'}} variant='outlined' onClick={getOrder}>Get Orders</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField width={500} label="Invoice Filter" value={queries.invoice} onChange={(e) => setQueries(prev => ({...prev, invoice: e.target.value}))}/>
                        <Button style={{width: '180px', margin: 'auto 10px', padding: '2px'}} variant='outlined' onClick={getInvoice}>Get Invoices</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField width={500} label="Bill Filter" value={queries.bill} onChange={(e) => setQueries(prev => ({...prev, bill: e.target.value}))}/>
                        <Button style={{width: '180px', margin: 'auto 10px', padding: '2px'}} variant='outlined' onClick={getBill}>Get Bills</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField width={500} label="Timesheet Filter" value={queries.timesheet} onChange={(e) => setQueries(prev => ({...prev, timesheet: e.target.value}))}/>
                        <Button style={{width: '180px', margin: 'auto 10px', padding: '2px'}} variant='outlined' onClick={getTimesheet}>Get Timesheets</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField width={500} label="Custom Query" value={queries.custom} onChange={(e) => setQueries(prev => ({...prev, custom: e.target.value}))}/>
                        <Button style={{width: '180px', margin: 'auto 10px', padding: '2px'}} variant='outlined' onClick={customQuery}>Query</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h6">MYOB Sync</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Button style={{width: '100px', margin: 'auto 5px', padding: '2px'}} variant='outlined' onClick={syncJobs}>Jobs</Button>
                        <Button style={{width: '100px', margin: 'auto 5px', padding: '2px'}} variant='outlined' onClick={syncClients}>Clients</Button>
                        <Button style={{width: '150px', margin: 'auto 5px', padding: '2px'}} variant='outlined' onClick={syncContractors}>Contractors</Button>
                        <Button style={{width: '100px', margin: 'auto 5px', padding: '2px'}} variant='outlined' onClick={syncInvoices}>Invoices</Button>
                        <Button style={{width: '100px', margin: 'auto 5px', padding: '2px'}} variant='outlined' onClick={syncBills}>Bills</Button>
                        <Button style={{width: '150px', margin: 'auto 5px', padding: '2px'}} variant='outlined' onClick={syncRemittance}>Remittance</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h6">MYOB Imports</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField width={250} label="Client Name" value={queries.clientName} onChange={(e) => setQueries(prev => ({...prev, clientName: e.target.value}))}/>
                        <Button style={{width: '180px', margin: 'auto 10px', padding: '2px'}} variant='outlined' onClick={importClientFromABN}>Import</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField width={250} label="Contractor Name" value={queries.contractorName} onChange={(e) => setQueries(prev => ({...prev, contractorName: e.target.value}))}/>
                        <InputField width={250} label="Contractor ABN" value={queries.contractorABN} onChange={(e) => setQueries(prev => ({...prev, contractorABN: e.target.value}))}/>
                        <Button style={{width: '180px', margin: 'auto 10px', padding: '2px'}} variant='outlined' onClick={importContractorFromABN}>Import</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <Button style={{width: '250px', margin: 'auto 5px', padding: '2px'}} variant='outlined' onClick={importContractorsFromBills}>Contractors from Bills</Button>
                        <Button style={{width: '200px', margin: 'auto 5px', padding: '2px'}} variant='outlined' onClick={importBGISInvoices}>BGIS Invoices</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h6">MYOB Create</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField label="Purchase Order #" value={fields.invoice} onChange={(e) => setFields(prev => ({...prev, invoice: e.target.value}))}/>
                        <Button style={{width: '180px', margin: 'auto 5px', padding: '2px'}} variant='outlined' onClick={createInvoice}>Create Invoice</Button>
                        <Button style={{width: '180px', margin: 'auto 5px', padding: '2px'}} variant='outlined' onClick={generateInvoice}>Generate Invoice</Button>
                    </Grid>
                    
                </Grid>
            : 
                <p>MYOB Connection Activated</p>
        }
    </>
    ); 

    
}

export default MyobActivate;

