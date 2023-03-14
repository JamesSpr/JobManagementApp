// Imports
import React, { useState, useEffect }  from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import axios from 'axios';
import JobTable from './JobTable';
import CreateDialog from './CreateDialog';
import { Button, Grid, Box, AppBar, Toolbar} from '@mui/material';
import { fetchData, fetchResources } from './QueryData';


const HomePage = () => {
    const axiosPrivate = useAxiosPrivate();

    // Data
    const [jobs, setJobs] = useState([]);
    const [users, setUsers] = useState([])

    // Textfield Select Options
    const [clients, setClients] = useState([]);
    const [clientContacts, setClientContacts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [jobStages, setJobStages] = useState([]);

    // Dialog States
    const [createJob, setCreateJob] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        const fetchJobData = async () => {
            await axiosPrivate({
                method: 'post',
                signal: controller.signal,
                data: fetchResources(),
            }).then((response) => {
                const res = response?.data?.data;
                console.log("res", res);
                setLocations(res?.locations);
                setClients(res?.clients)
                setClientContacts(res?.clientContacts)
                setUsers(res?.users)
                setJobStages(res?.__type.enumValues)
            }).catch((err) => {
                // TODO: handle error
                if(err.name === "CanceledError") {
                    return
                }
                console.log("Error:", err);
            });
    
            let nextPage = true;
            let next = "";
    
            // Get Data
            await axiosPrivate({
                method: 'post',
                signal: controller.signal,
                data: fetchData(120, next),
            }).then((response) => {
                const res = response?.data?.data?.jobPage;
                // console.log("res", response);
                if(res) {
                    next = res.pageInfo.startCursor;
                    nextPage = res.pageInfo.hasPreviousPage;
                    
                    for(let i = 0; i < res.edges.length; i++) {
                        res.edges[i].node['dateIssued'] = res.edges[i].node['dateIssued'] ? new Date(res.edges[i].node['dateIssued']).toLocaleDateString('en-AU') : ""
                        res.edges[i].node['overdueDate'] = res.edges[i].node['overdueDate'] ? new Date(res.edges[i].node['overdueDate']).toLocaleDateString('en-AU') : ""
                        res.edges[i].node['invoiceDate'] = res.edges[i].node['invoiceDate'] ? new Date(res.edges[i].node['invoiceDate']).toLocaleDateString('en-AU') : ""
                        res.edges[i].node['invoiceCreatedDate'] = res.edges[i].node['invoiceCreatedDate'] ? new Date(res.edges[i].node['invoiceCreatedDate']).toLocaleDateString('en-AU') : ""
                    }
    
                    setJobs(prev => [...prev, ...res?.edges.map(job => job.node)]);
                } else {
                    nextPage = false; 
                }
            }).catch((err) => {
                if(err.code === 'ERR_CANCELLED') {
                    return
                }
                console.log("Error:", err);
            });
    
            if(next) {
                // Get Data
                await axiosPrivate({
                    method: 'post',
                    signal: controller.signal,
                    data: fetchData(20000, next),
                }).then((response) => {
                    const res = response?.data?.data?.jobPage;
                    // console.log("res", response);
                    if(res) {
                        next = res.pageInfo.startCursor;
                        nextPage = res.pageInfo.hasPreviousPage;
                        
                        for(let i = 0; i < res.edges.length; i++) {
                            res.edges[i].node['dateIssued'] = res.edges[i].node['dateIssued'] ? new Date(res.edges[i].node['dateIssued']).toLocaleDateString('en-AU') : ""
                            res.edges[i].node['overdueDate'] = res.edges[i].node['overdueDate'] ? new Date(res.edges[i].node['overdueDate']).toLocaleDateString('en-AU') : ""
                            res.edges[i].node['invoiceDate'] = res.edges[i].node['invoiceDate'] ? new Date(res.edges[i].node['invoiceDate']).toLocaleDateString('en-AU') : ""
                            res.edges[i].node['invoiceCreatedDate'] = res.edges[i].node['invoiceCreatedDate'] ? new Date(res.edges[i].node['invoiceCreatedDate']).toLocaleDateString('en-AU') : ""
                        }
    
                        setJobs(prev => [...prev, ...res?.edges.map(job => job.node)]);
                    } else {
                        nextPage = false; 
                    }
                }).catch((err) => {
                    if(err.code === 'ERR_CANCELLED') {
                        return
                    }
                    console.log("Error:", err);
                });
            }
        }

        fetchJobData();

        return () => {
            controller.abort();
        }
    }, []);

    const handleDialogClose = (event, reason, created, updated) => {
        if (reason !== 'backdropClick') {
            if(created && Object.keys(created).length !== 0){
                if(updated) {
                    // Update the job table row with the new data
                    setJobs(old => old.map((row, index) => {
                        if(row.id === created.id) {
                            return created
                        }
                        return row
                    }))
                }
                else {
                    setJobs(prev => [...prev, created])
                }
            }
            setCreateJob(false);
        }
    }
    return (
    <>
        <Grid>
            <Grid item xs={12} align="center">
                <JobTable tableData={jobs} users={users.edges} jobStages={jobStages}/>
            </Grid>
        </Grid>

        {/* Create new Dialog */}
        <CreateDialog open={createJob} onClose={handleDialogClose} clients={clients} clientContacts={clientContacts} locations={locations}/>

        {/* Footer AppBar with Controls */}
        <Box sx={{ flexGrow: 1}}>
            <AppBar position="fixed" 
                sx={{ top:'auto', bottom: 0, zIndex: (theme) => theme.zIndex.drawer + 1,height: '50px', 
                backgroundColor: 'rgb(250,250,250)', 
                boxShadow: 'rgb(0 0 0 / 10%) 0px 1px 1px -1px, rgb(0 0 0 / 10%) 0px 1px 1px 0px, rgb(0 0 0 / 10%) 0px 0 10px 2px'}}
            >
                <Toolbar style={{minHeight: '50px'}}>
                    <Box style={{margin: '0 auto'}}>
                        <Button variant="outlined" 
                            sx={{margin: '0px 5px 0px 5px'}}
                            onClick={(e) => setCreateJob(true)}
                        >
                            Create New Job
                        </Button>
                    </Box>
                </Toolbar>
            </AppBar>
        </Box>
    </>
    );
}

export default HomePage;