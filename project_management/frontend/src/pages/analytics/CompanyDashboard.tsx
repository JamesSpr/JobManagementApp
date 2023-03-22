import { Grid } from "@mui/material";
import { useState, useEffect } from "react";
import { ProgressButton } from "../../components/Components";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useAuth from "../auth/useAuth";

const CompanyDashboard = () => {

    const axiosPrivate = useAxiosPrivate();
    const { auth } = useAuth();
    const [loading, setLoading] = useState(false);
    const [waiting, setWaiting] = useState({transactionSync: false});

    const syncTransactions = async () => {
        await axiosPrivate({ 
            method: 'post',
            data: JSON.stringify({
                query: `{ 
                    mutation syncTransaction($uid:String!) {
                        sync: syncTransaction(uid: $uid) {
                            success
                            data
                        }
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id
                }
            }),
        }).then((response) => {
            const res = response?.data?.data.sync;
            console.log(res)

        }).catch((err) => {
            // TODO: handle error
            if(err.name === "CanceledError") {
                return
            }
            console.log("Error:", err);
        });
    }


    return (
        <>
            <Grid>
                <Grid item xs={12}>
                    <h6>Sync Data</h6>
                    <ProgressButton name={"Transactions"} waiting={waiting.transactionSync} onClick={syncTransactions}/>

                </Grid>
            </Grid>
        </>
    )
}

export default CompanyDashboard;