import { Box, Button, CircularProgress, Grid, Typography } from "@mui/material";
import React, { useState } from "react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

const Imports = () => {
    const axiosPrivate = useAxiosPrivate();
    const [waiting, setWaiting] = useState({});

    const handleJobImport = async () => {
        setWaiting(prev => ({...prev, job: true}));
        const [file] = jobs_input.files;
        if (!file) return
        const data = await file.text()
        console.log(data);
    
        try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                query: `
                mutation uploadJobsCsv($file: String!) {
                    upload_jobs_csv: uploadJobsCsv(file: $file) {
                        success
                    }
                }`,
                variables: { 
                    file: data,
                },
            }),
            }).then((response) => {
                const res = response?.data?.data;
                setWaiting(prev => ({...prev, job: true}));
                console.log(res);
            });
        } catch (err) {
            console.log("error:", err);
        }
    
    }

    const handleLocationImport = async () => {
        setWaiting(prev => ({...prev, location: true}));
        const [file] = locations_input.files;
        if (!file) return
        const data = await file.text()
        console.log(data);
    
        try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                query: `
                mutation uploadLocationsCsv($file: String!) {
                    upload_locations_csv: uploadLocationsCsv(file: $file) {
                        success
                    }
                }`,
                variables: { 
                    file: data,
                },
            }),
            }).then((response) => {
                const res = response?.data?.data;
                setWaiting(prev => ({...prev, location: false}));
                console.log(res);
            });
        } catch (err) {
            console.log("error:", err);
        }
    
    }
    
    const handleClientContactImport = async () => {
        setWaiting(prev => ({...prev, clientcontact: true}));
        const [file] = client_contact_input.files;
        if (!file) return
        const data = await file.text()
        console.log(data);
    
        try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                query: `
                mutation uploadClientContactsCsv($file: String!) {
                    upload_client_contacts_csv: uploadClientContactsCsv(file: $file) {
                        success
                    }
                }`,
                variables: { 
                    file: data,
                },
            }),
            }).then((response) => {
                const res = response?.data?.data;
                setWaiting(prev => ({...prev, clientcontact: false}));
                console.log(res);
            });
        } catch (err) {
            console.log("error:", err);
        }
    
    }

    const handleClientImport = async () => {
        setWaiting(prev => ({...prev, client: true}));
        const [file] = client_input.files;
        if (!file) return
        const data = await file.text()
        console.log("clientData", data);
    
        try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                query: `
                mutation uploadClientsCsv($file: String!) {
                    upload_clients_csv: uploadClientsCsv(file: $file) {
                        success
                    }
                }`,
                variables: { 
                    file: data,
                },
            }),
            }).then((response) => {
                const res = response?.data?.data;
                setWaiting(prev => ({...prev, client: false}));
                console.log(res);
            });
        } catch (err) {
            console.log("error:", err);
        }
    
    }

    const handleClientRegionImport = async () => {
        setWaiting(prev => ({...prev, clientregion: true}));
        const [file] = client_region_input.files;
        if (!file) return
        const data = await file.text()
        console.log(data);
    
        try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                query: `
                mutation uploadClientRegionsCsv($file: String!) {
                    upload_client_regions_csv: uploadClientRegionsCsv(file: $file) {
                        success
                    }
                }`,
                variables: { 
                    file: data,
                },
            }),
            }).then((response) => {
                const res = response?.data?.data;
                setWaiting(prev => ({...prev, clientregion: false}));
                console.log(res);
            });
        } catch (err) {
            console.log("error:", err);
        }
    
    }
    
    const handleInvoiceDetailsImport = async () => {
        setWaiting(prev => ({...prev, invoiceDetails: true}));
        const [file] = invoice_details_input.files;
        if (!file) return
        const data = await file.text()
        console.log(data);
    
        try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                query: `
                mutation uploadInvoiceDetailsCsv($file: String!) {
                    upload_invoice_details_csv: uploadInvoiceDetailsCsv(file: $file) {
                        success
                    }
                }`,
                variables: { 
                    file: data,
                },
            }),
            }).then((response) => {
                const res = response?.data?.data;
                setWaiting(prev => ({...prev, invoiceDetails: false}));
                console.log(res);
            });
        } catch (err) {
            console.log("error:", err);
        }
    
    }  
    

    return (
    <>
        <Grid item xs={12} align="center">
            <Typography variant='h6'>Imports</Typography>
        </Grid>
        <Grid item xs={12} align="center">
            <Typography>Clients</Typography>
            <input type="file" id="client_input" accept='.csv' />
            <Box sx={{ m: 1, position: 'relative' }} style={{display: 'inline-block'}}>
                <Button variant="outlined" onClick={handleClientImport} disabled={waiting.client}>Submit</Button>
                {waiting.client && (
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
            <Typography>Client Regions</Typography>
            <input type="file" id="client_region_input" accept='.csv' />
            <Box sx={{ m: 1, position: 'relative' }} style={{display: 'inline-block'}}>
                <Button variant="outlined" onClick={handleClientRegionImport} disabled={waiting.clientregion}>Submit</Button>
                {waiting.clientregion && (
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
            <Typography>Client Contacts</Typography>
            <input type="file" id="client_contact_input" accept='.csv' />
            <Box sx={{ m: 1, position: 'relative' }} style={{display: 'inline-block'}}>
                <Button variant="outlined" onClick={handleClientContactImport} disabled={waiting.clientcontact}>Submit</Button>
                {waiting.clientcontact && (
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
            <Typography>Locations</Typography>
            <input type="file" id="locations_input" accept='.csv' />
            <Box sx={{ m: 1, position: 'relative' }} style={{display: 'inline-block'}}>
                <Button variant="outlined" onClick={handleLocationImport} disabled={waiting.location}>Submit</Button>
                {waiting.location && (
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
        <Grid />
        <Grid item xs={12} align="center">
            <Typography>Jobs</Typography>
            <input type="file" id="jobs_input" accept='.csv' />
            <Box sx={{ m: 1, position: 'relative' }} style={{display: 'inline-block'}}>
                <Button variant="outlined" onClick={handleJobImport} disabled={waiting.job}>Submit</Button>
                {waiting.job && (
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
            <Typography>Invoice Details</Typography>
            <input type="file" id="invoice_details_input" accept='.csv' />
            <Box sx={{ m: 1, position: 'relative' }} style={{display: 'inline-block'}}>
                <Button variant="outlined" onClick={handleInvoiceDetailsImport} disabled={waiting.invoiceDetails}>Submit</Button>
                {waiting.invoiceDetails && (
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

export default Imports;