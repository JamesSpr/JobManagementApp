import React, { useState, useEffect }  from 'react';
import { axiosPrivate } from '../../hooks/axios';
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Grid, Typography,} from '@mui/material';
import axios from 'axios';
import useAuth from './useAuth';
import { InputField } from '../../components/Components';

const MyobActivate = () => {

    const { auth, setAuth } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const code = searchParams.get('code');
    const navigate = useNavigate();

    const [queries, setQueries] = useState({client: "CompanyName eq 'BGIS'", contractor: "CompanyName eq 'Buildlogic Pty Ltd'", bill: "Number eq '00006510'", order: "Number eq '00001570'", invoice: "Number eq '00001481'", job: "Number eq 'PO8172189'"});
    const [fields, setFields] = useState({invoice: ""})

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
                    // console.log("success", response.data);
                    const res = response.data?.data?.myob_get_access_token;
    
                    if(res.success) {
                        const token = JSON.parse(res.response);
                        // console.log('access_token:', token)
                        axiosPrivate({
                            method: 'post',
                            cancelToken: cancelToken.token,
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
                            // console.log("response", response)
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
                    uid: auth?.myob.id,
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
                            uid: auth?.myob.id,
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
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobGetAccounts($uid:String!) {
                    myob_get_accounts: myobGetAccounts(uid:$uid) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob.id,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.myob_get_accounts;
            if(res.success) {
                // console.log(res.message)
                const accounts = JSON.parse(res.message);
                console.log("Accounts:", accounts)
            }
            else {
                console.log("error!", JSON.parse(res.message) ?? "");
            }
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
                    uid: auth?.myob.id,
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
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobGetGeneralJournal($uid:String!) {
                    generalJournal: myobGetGeneralJournal(uid:$uid) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob.id,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.generalJournal;
            if(res.success) {
                // console.log(res.message)
                const generalJournal = JSON.parse(res.message);
                console.log("General Journal:", generalJournal)
            }
            else {
                console.log("error!", JSON.parse(res.message) ?? "");
            }
        })
    }

    const getClients = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobGetClients($uid:String!, $client:String!) {
                    myob_get_clients: myobGetClients(uid:$uid, client:$client) {
                        success
                        message
                    } 
                }`,
                variables: {
                    uid: auth?.myob.id,
                    client: queries?.client,
                },
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.myob_get_clients;
            if(res.success) {
                const clients = JSON.parse(res.message);
                console.log("Clients:", clients)
            }
            else {
                console.log("error!");
            }
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
                    uid: auth?.myob.id,
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
                    uid: auth?.myob.id,
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
                    uid: auth?.myob.id,
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

    const getJobs = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobGetJobs($uid:String!, $job:String!) {
                    myob_get_jobs: myobGetJobs(uid:$uid, job:$job) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob.id,
                    job: queries.job,
                }
            })
        }).then((response) => {
            const res = response.data?.data?.myob_get_jobs;
            if(res.success) {
                const jobs = JSON.parse(res.message);
                console.log("Jobs:", jobs)
            }
            else {
                console.log("error!", JSON.parse(res.message) ?? "");
            }
        })
    }

    const getContractors = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobGetContractors($uid:String!, $contractor:String!) {
                    myob_get_contractors: myobGetContractors(uid:$uid, contractor:$contractor) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob.id,
                    contractor: queries.contractor,
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
                    uid: auth?.myob.id,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.myob_sync_clients;
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
                    uid: auth?.myob.id,
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
                    uid: auth?.myob.id,
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
                    uid: auth?.myob.id,
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
                    uid: auth?.myob.id,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.myob_sync_bills;
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
                    uid: auth?.myob.id,
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
                    uid: auth?.myob.id,
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
                    }
                }`,
                variables: {
                    uid: auth?.myob.id,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.custom;
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
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation myobCreateInvoice($uid:String!, $job:String!) {
                    myob_create_invoice: myobCreateInvoice(uid:$uid, job:$job) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob.id,
                    job: fields.invoice,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.myob_create_invoice;
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
                    uid: auth?.myob.id,
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
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography variant="h6">MYOB Authentication</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Button onClick={testRefresh}>Refresh</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h6">MYOB Requests</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Button onClick={getAccounts}>Get Accounts</Button>
                        <Button onClick={getTaxCodes}>Get Tax Codes</Button>
                        <Button onClick={getGeneralJournal}>Get General Journal</Button>
                        <Button onClick={customFunction}>Custom Function</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField wide label="Job Filter" value={queries.job} onChange={(e) => setQueries(prev => ({...prev, job: e.target.value}))}/>
                        <Button onClick={getJobs}>Get Jobs</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField wide label="Client Filter" value={queries.client} onChange={(e) => setQueries(prev => ({...prev, client: e.target.value}))}/>
                        <Button onClick={getClients}>Get Clients</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField wide label="Contractor Filter" value={queries.contractor} onChange={(e) => setQueries(prev => ({...prev, contractor: e.target.value}))}/>
                        <Button onClick={getContractors}>Get Contractors</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField wide label="Orders Filter" value={queries.order} onChange={(e) => setQueries(prev => ({...prev, order: e.target.value}))}/>
                        <Button onClick={getOrder}>Get Orders</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField wide label="Invoice Filter" value={queries.invoice} onChange={(e) => setQueries(prev => ({...prev, invoice: e.target.value}))}/>
                        <Button onClick={getInvoice}>Get Invoices</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField wide label="Bill Filter" value={queries.bill} onChange={(e) => setQueries(prev => ({...prev, bill: e.target.value}))}/>
                        <Button onClick={getBill}>Get Bills</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h6">MYOB Sync</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Button onClick={syncJobs}>Jobs</Button>
                        <Button onClick={syncClients}>Clients</Button>
                        <Button onClick={syncContractors}>Contractors</Button>
                        <Button onClick={syncInvoices}>Invoices</Button>
                        <Button onClick={syncBills}>Bills</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h6">MYOB Imports</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Button onClick={importContractorsFromBills}>Contractors from Bills</Button>
                        <Button onClick={importBGISInvoices}>BGIS Invoices</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h6">MYOB Create</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <InputField label="Purchase Order #" value={fields.invoice} onChange={(e) => setFields(prev => ({...prev, invoice: e.target.value}))}/>
                        <Button onClick={createInvoice}>Create Invoice</Button>
                        <Button onClick={generateInvoice}>Generate Invoice</Button>
                    </Grid>
                    
                </Grid>
            : 
                <p>MYOB Connection Activated</p>
        }
    </>
    ); 

    
}

export default MyobActivate;

