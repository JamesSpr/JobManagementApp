import React, { useState } from "react";
import { Box, Grid, Typography, Button, CircularProgress, TextField } from '@mui/material';
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import DoubleArrowIcon from '@mui/icons-material/DoubleArrow';


const Transfers = () => {
    const axiosPrivate = useAxiosPrivate();
    const [waiting, setWaiting] = useState({});
    const [transferEstimate, setTransferEstimate] = useState({'estimate': '', 'to': ''})
    const [transferInvoice, setTransferInvoice] = useState({'invoice': '', 'to': ''})

    const handleTransferEstimate = async () => {
        setWaiting(prev => ({...prev, transferEstimate: true}));
        try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                query: `
                mutation transferEstimate($estimateId:String!, $toJob:String!) {
                    transfer_estimate: transferEstimate(estimateId:$estimateId, toJob:$toJob) {
                        success
                        message
                    }
                }`,
                variables: { 
                    estimateId: transferEstimate.estimate,
                    toJob: transferEstimate.to
                },
            }),
            }).then((response) => {
                const res = response?.data?.data;
                setWaiting(prev => ({...prev, transferEstimate: false}));
                console.log(res);
            });
        } catch (err) {
            console.log("error:", err);
        }
        
    
    }

    const handleTransferInvoice = async () => {
        setWaiting(prev => ({...prev, transferInvoice: true}));
        try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                query: `
                mutation transferInvoice($jobInvoiceId:String!, $toJob:String!) {
                    transfer_invoice: transferInvoice(jobInvoiceId:$jobInvoiceId, toJob:$toJob) {
                        success
                        message
                    }
                }`,
                variables: { 
                    jobInvoiceId: transferInvoice.invoice,
                    toJob: transferInvoice.to
                },
            }),
            }).then((response) => {
                const res = response?.data?.data;
                setWaiting(prev => ({...prev, transferInvoice: false}));
                console.log(res);
            });
        } catch (err) {
            console.log("error:", err);
        }
    }
    
    
    return (
        <>
            <Grid item xs={12} align="center">
                <Typography variant='h6'>Transfer Between Jobs</Typography>
            </Grid>
            <Grid item xs={12} align="center">
                <Typography>Estimate</Typography>
                <TextField label="Estimate ID" onChange={e => {setTransferEstimate(prev => ({...prev, 'estimate': e.target.value}))}}/>
                <DoubleArrowIcon sx={{marginTop: '16px'}}/>
                <TextField label="Job ID" onChange={e => {setTransferEstimate(prev => ({...prev, 'to': e.target.value}))}}/>
            </Grid>
            <Grid item xs={12} align="center">
                <Box sx={{ m: 1, position: 'relative' }} style={{display: 'inline-block'}}>
                    <Button variant="outlined" onClick={handleTransferEstimate}>Transfer Estimate</Button>
                    {waiting.transferEstimate && (
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
            <Grid item xs={12} align="center">
                <Typography>Invoice</Typography>
                <TextField label="Job Invoice ID" onChange={e => {setTransferInvoice(prev => ({...prev, 'invoice': e.target.value}))}}/>
                <DoubleArrowIcon sx={{marginTop: '16px'}}/>
                <TextField label="New Job ID" onChange={e => {setTransferInvoice(prev => ({...prev, 'to': e.target.value}))}}/>
            </Grid>
            <Grid item xs={12} align="center">
                <Box sx={{ m: 1, position: 'relative' }} style={{display: 'inline-block'}}>
                    <Button variant="outlined" onClick={handleTransferInvoice}>Transfer Invoice</Button>
                    {waiting.transferInvoice && (
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
        </>
    )
}

export default Transfers;