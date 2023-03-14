import React, { useState, useEffect } from "react";
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { useParams } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Grid, Portal, Snackbar, TextField, Typography } from "@mui/material";
import produce from "immer";
import useAuth from "../auth/useAuth";
import { InputField } from "../../components/Components";

const UpdateJob = () => {

    const { auth } = useAuth();
    const axiosPrivate = useAxiosPrivate();
    const [invoices, setInvoices] = useState([]);
    
    const [waiting, setWaiting] = useState(false);
    const [snack, setSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const [snackVariant, setSnackVariant] = useState('info');
    

    const {input} = useParams();
    
    useEffect(() => {
        if(input) {
            const jsonInput = JSON.parse(input.replace(new RegExp("'", 'g'), "\""));
            setInvoices(jsonInput);
        }
    }, [])

    const handleSubmit = async () => {
        console.log(invoices)

        setWaiting(true);
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation convertSale($uid:String!, $invoices: [InvoiceInput]!) {
                    convert_sale: convertSale(uid: $uid, invoices: $invoices) {
                        success
                        message
                        error
                        converted
                    }
                }`,
                variables: {
                    uid: auth?.myob.id,
                    invoices: invoices,
                },
            }),
        }).then((response) => {
            console.log(response);
            const res = response?.data?.data?.convert_sale;

            if(res?.success) {
                axiosPrivate({
                    method: 'post',
                    data: JSON.stringify({
                        query: `
                        mutation updateInvoices($invoices: [InvoiceUpdateInput]!) {
                            update_invoices: updateInvoices(invoices: $invoices) {
                                success
                                message
                                jobInvoice {
                                    job {
                                        po
                                    }
                                    invoice {
                                        number
                                        dateIssued
                                    }
                                }
                            }
                        }`,
                        variables: {
                            invoices: invoices,
                        },
                    }),
                }).then((response) => {
                    console.log(response);
                    const res = response?.data?.data?.update_invoices;
                    setWaiting(false);
                    setSnack(true);

                    if(res?.success) {
                        setSnackVariant('success');
                        setSnackMessage("Invoices Updated Successfully");
                    }
                    else {
                        setSnackVariant('error');
                        setSnackMessage("Error updating invoices");
                    }
                });
            }
            else {
                // console.log("Error", res)
                setWaiting(false);
                setSnack(true);
                setSnackVariant('error');
                setSnackMessage("Error Converting Invoices");
            }
        });
    }

    // /invoices/update/[{'number':'1234', 'dateIssued':'2022-09-21'}, {'number':'2345', 'dateIssued':'2022-09-21'}]
    return (
        <>
        <Grid container spacing={2}>
            <Grid item xs={12} align="center">
                <Typography variant="h6">Please confirm the invoice details</Typography>
            </Grid>
            {invoices ? invoices.map((inv, idx) => {
                return (
                    <Grid item xs={12} align="center">
                        <InputField halfWidth
                            key={"inv"+idx}
                            label="Invoice Number"
                            value={inv.number}
                            onChange={(e) => {
                                setInvoices(prev => (prev.map((inv, i) => {
                                    if(i === idx){
                                        const newValue = produce(prev[i], draft => {
                                            draft.number = e.target.value;
                                        })
                                        return newValue;
                                    }
                                    return inv;
                                }
                            )))}}
                        />
                        <InputField halfWidth
                            type="date" 
                            key={"date"+idx}
                            label="Date Issued" 
                            value={inv.dateIssued}
                            onChange={(e) => {setInvoices(prev => (prev.map((inv, i) => {
                                if(i === idx){
                                    const newValue = produce(prev[i], draft => {
                                        draft.number = e.target.value;
                                    })
                                    return newValue;
                                }
                                return inv;
                            })))}}
                        />
                    </Grid>
                )
            })
            : <></>    
            }
            
            <Grid item xs={12} align="center">
                <Box sx={{ m: 1, position: 'relative' }} style={{display: 'inline-block'}}>
                    <Button variant="outlined" onClick={handleSubmit}>Confirm</Button>
                    {waiting && (
                        <CircularProgress size={24} 
                            sx={{
                                colour: 'primary', 
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                marginTop: '-12px',
                                marginLeft: '-12px',
                            }}
                        />
                    )}
                </Box>
            </Grid>
        </Grid>

        <Portal>
            {/* Notification Snackbar */}
            <Snackbar
                anchorOrigin={{vertical: "bottom", horizontal:"center"}}
                open={snack}
                autoHideDuration={12000}
                onClose={(e) => setSnack(false)}
                >
                <Alert onClose={(e) => setSnack(false)} severity={snackVariant} sx={{width: '100%'}}>{snackMessage}</Alert>
            </Snackbar>
        </Portal>

        </>

    )

}

export default UpdateJob;