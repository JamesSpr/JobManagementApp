import { Grid } from "@mui/material";
import { useState, useEffect } from "react";
import { ProgressButton } from "../../components/Components";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useAuth from "../auth/useAuth";

interface LastSyncType {
    Object : { syncDateTime: Date}
}

const CompanyDashboard = () => {

    const axiosPrivate = useAxiosPrivate();
    const { auth } = useAuth();
    const [lastSync, setLastSync] = useState<LastSyncType>()
    const [loading, setLoading] = useState(false);
    const [waiting, setWaiting] = useState({transactionSync: false, accountSync: false});

    // Get Data
    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            await axiosPrivate({ 
                method: 'post',
                signal: controller.signal,
                data: JSON.stringify({
                    query: `{ 
                        Account: synctype(syncType: "ACC") {
                            syncDateTime
                        }
                        Transaction: synctype(syncType: "TRA") {
                            syncDateTime
                        }
                        Client: synctype(syncType: "CLI") {
                            syncDateTime
                        }
                    }`,
                    variables: {}
                }),
            }).then((response) => {
                const res = response?.data?.data;
                console.log(res);

                setLastSync(res);

                setLoading(false);

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
    }, []);

    const syncTransactions = async () => {
        setWaiting(prev => ({...prev, transactionSync: true}))
        await axiosPrivate({ 
            method: 'post',
            data: JSON.stringify({
                query: `
                    mutation syncTransactions($uid:String!) {
                        transactions: syncTransactions(uid: $uid) {
                            success
                            data
                        }
                    }
                `,
                variables: {
                    uid: auth?.myob?.id
                }
            }),
        }).then((response) => {
            const res = response?.data?.data.transactions;
            console.log(res);
            setLastSync(prev => ({ ...prev, Transaction: new Date(Date.now()).toUTCString() } as LastSyncType))
        }).catch((err) => {
            // TODO: handle error
            if(err.name === "CanceledError") {
                return
            }
            console.log("Error:", err);
        }).finally(() => {
            setWaiting(prev => ({...prev, transactionSync: false}))
        });
    }

    const syncAccounts = async () => {
        setWaiting(prev => ({...prev, accountSync: true}))
        await axiosPrivate({ 
            method: 'post',
            data: JSON.stringify({
                query: `
                    mutation syncAccounts($uid:String!) {
                        accounts: syncAccounts(uid: $uid) {
                            success
                            data
                        }
                    }
                `,
                variables: {
                    uid: auth?.myob?.id
                }
            }),
        }).then((response) => {
            const res = response?.data?.data.accounts;
            console.log(res);
            setLastSync(prev => ({...prev, Account: new Date(Date.now()).toUTCString()} as LastSyncType))
        }).catch((err) => {
            // TODO: handle error
            if(err.name === "CanceledError") {
                return
            }
            console.log("Error:", err);
        }).finally(() => {
            setWaiting(prev => ({...prev, accountSync: false}))
        });
    }

    return (
        <>
            <Grid container spacing={1} alignItems="center" 
                justifyContent="center"
                direction="column">
                <Grid item xs={12}>
                    <h4>Sync Data</h4>
                    {lastSync && Object.entries(lastSync as LastSyncType).map(([key, val])=> {
                        console.log(key, val ? val['syncDateTime'] : "N/A")
                        return(<p>Last {key} Sync: {val ? val['syncDateTime'] : "N/A"}</p>)
                    })}
                    <ProgressButton name={"Transactions"} waiting={waiting.transactionSync} onClick={syncTransactions}/>
                    <ProgressButton name={"Accounts"} waiting={waiting.accountSync} onClick={syncAccounts}/>

                </Grid>
            </Grid>
        </>
    )
}

export default CompanyDashboard;