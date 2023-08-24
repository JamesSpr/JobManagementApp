// Imports
import React, { useState, useEffect }  from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import JobTable from './JobTable';
import CreateDialog from './CreateDialog';
import { Button, Grid, Box, AppBar, Toolbar} from '@mui/material';
import { fetchData, fetchResources } from './QueryData';
import { ClientType, ContactType, EmployeeType, JobStageType, JobType, LocationType } from '../../types/types';


const HomePage = () => {
    const axiosPrivate = useAxiosPrivate();

    // Data
    const [jobs, setJobs] = useState<JobType[]>([]);
    const [users, setUsers] = useState<EmployeeType[]>([])

    // Textfield Select Options
    const [clients, setClients] = useState<ClientType[]>([]);
    const [clientContacts, setClientContacts] = useState<ContactType[]>([]);
    const [locations, setLocations] = useState<LocationType[]>([]);
    const [jobStages, setJobStages] = useState<JobStageType[]>([]);

    const [refreshTableData, setRefreshTableData] = useState(false)
    const [createJob, setCreateJob] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        setJobs([]);

        const fetchJobData = async () => {
            await axiosPrivate({
                method: 'post',
                signal: controller.signal,
                data: fetchResources(),
            }).then((response) => {
                const res = response?.data?.data;
                // console.log("res", res);
                setLocations(res?.locations);
                setClients(res?.clients)
                setClientContacts(res?.clientContacts)
                const users = res?.users.edges.map((user: { node: any; }) => {return user.node})
                // Sort users
                users.sort((a: { firstName: string; }, b: { firstName: string; }) => {
                    // ignore case
                    const nameA = a.firstName.toUpperCase(); 
                    const nameB = b.firstName.toUpperCase();
                    if (nameA > nameB) {
                    return 1;
                    }
                    if (nameA < nameB) {
                    return -1;
                    }
                
                    // names must be equal
                    return 0;
                });
                setUsers(users)
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
                if(res) {
                    next = res.pageInfo.startCursor;
                    nextPage = res.pageInfo.hasPreviousPage;
                    
                    for(let i = 0; i < res.edges.length; i++) {
                        res.edges[i].node['dateIssued'] = res.edges[i].node['dateIssued'] ? new Date(res.edges[i].node['dateIssued']).toLocaleDateString('en-AU') : ""
                        res.edges[i].node['overdueDate'] = res.edges[i].node['overdueDate'] ? new Date(res.edges[i].node['overdueDate']).toLocaleDateString('en-AU') : ""
                        res.edges[i].node['commencementDate'] = res.edges[i].node['commencementDate'] ? new Date(res.edges[i].node['commencementDate']).toLocaleDateString('en-AU') : ""
                        res.edges[i].node['completionDate'] = res.edges[i].node['completionDate'] ? new Date(res.edges[i].node['completionDate']).toLocaleDateString('en-AU') : ""
                        res.edges[i].node['inspectionDate'] = res.edges[i].node['inspectionDate'] ? new Date(res.edges[i].node['inspectionDate']).toLocaleDateString('en-AU') : ""
                        res.edges[i].node['closeOutDate'] = res.edges[i].node['closeOutDate'] ? new Date(res.edges[i].node['closeOutDate']).toLocaleDateString('en-AU') : ""
                        res.edges[i].node['estimateSet']['issueDate'] = res.edges[i].node['estimateSet']['issueDate'] ? new Date(res.edges[i].node['estimateSet']['issueDate']).toLocaleDateString('en-AU') : ""
                        res.edges[i].node['estimateSet']['approvalDate'] = res.edges[i].node['estimateSet']['approvalDate'] ? new Date(res.edges[i].node['estimateSet']['approvalDate']).toLocaleDateString('en-AU') : ""
                        
                        if(res.edges[i].node['jobinvoiceSet'].length > 0) {
                            res.edges[i].node['jobinvoiceSet'][0]['invoice']['dateCreated'] = res.edges[i].node['jobinvoiceSet'][0]?.invoice?.dateCreated ? new Date(res.edges[i].node['jobinvoiceSet'][0]?.invoice?.dateCreated).toLocaleDateString('en-AU') : ""
                            res.edges[i].node['jobinvoiceSet'][0]['invoice']['dateIssued'] = res.edges[i].node['jobinvoiceSet'][0]?.invoice?.dateIssued ? new Date(res.edges[i].node['jobinvoiceSet'][0]?.invoice?.dateIssued).toLocaleDateString('en-AU') : ""
                            res.edges[i].node['jobinvoiceSet'][0]['invoice']['datePaid'] = res.edges[i].node['jobinvoiceSet'][0]?.invoice?.datePaid ? new Date(res.edges[i].node['jobinvoiceSet'][0]?.invoice?.datePaid).toLocaleDateString('en-AU') : ""
                        }
                    }
    
                    setJobs(prev => [...prev, ...res?.edges.map((job: { node: any; }) => job.node)]);
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
                            res.edges[i].node['commencementDate'] = res.edges[i].node['commencementDate'] ? new Date(res.edges[i].node['commencementDate']).toLocaleDateString('en-AU') : ""
                            res.edges[i].node['completionDate'] = res.edges[i].node['completionDate'] ? new Date(res.edges[i].node['completionDate']).toLocaleDateString('en-AU') : ""
                            res.edges[i].node['inspectionDate'] = res.edges[i].node['inspectionDate'] ? new Date(res.edges[i].node['inspectionDate']).toLocaleDateString('en-AU') : ""
                            res.edges[i].node['closeOutDate'] = res.edges[i].node['closeOutDate'] ? new Date(res.edges[i].node['closeOutDate']).toLocaleDateString('en-AU') : ""
                            res.edges[i].node['estimateSet']['issueDate'] = res.edges[i].node['estimateSet']['issueDate'] ? new Date(res.edges[i].node['estimateSet']['issueDate']).toLocaleDateString('en-AU') : ""
                            res.edges[i].node['estimateSet']['approvalDate'] = res.edges[i].node['estimateSet']['approvalDate'] ? new Date(res.edges[i].node['estimateSet']['approvalDate']).toLocaleDateString('en-AU') : ""

                            if(res.edges[i].node['jobinvoiceSet'].length > 0) {
                                res.edges[i].node['jobinvoiceSet'][0]['invoice']['dateCreated'] = res.edges[i].node['jobinvoiceSet'][0]?.invoice?.dateCreated ? new Date(res.edges[i].node['jobinvoiceSet'][0]?.invoice?.dateCreated).toLocaleDateString('en-AU') : ""
                                res.edges[i].node['jobinvoiceSet'][0]['invoice']['dateIssued'] = res.edges[i].node['jobinvoiceSet'][0]?.invoice?.dateIssued ? new Date(res.edges[i].node['jobinvoiceSet'][0]?.invoice?.dateIssued).toLocaleDateString('en-AU') : ""
                                res.edges[i].node['jobinvoiceSet'][0]['invoice']['datePaid'] = res.edges[i].node['jobinvoiceSet'][0]?.invoice?.datePaid ? new Date(res.edges[i].node['jobinvoiceSet'][0]?.invoice?.datePaid).toLocaleDateString('en-AU') : ""
                            }
                        }
    
                        setJobs(prev => [...prev, ...res?.edges.map((job: { node: any; }) => job.node)]);
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
        // console.log("Fetched Data");
        setRefreshTableData(false);

        return () => {
            controller.abort();
        }
    }, [, refreshTableData]);

    const handleDialogClose = ({event, reason, updated, createdJob}: {
        event: any, reason: string, updated: boolean, createdJob: JobType
    }) => {
        if (reason !== 'backdropClick') {
            if(createdJob && Object.keys(createdJob).length !== 0){
                if(updated) {
                    // Update the job table row with the new data
                    setJobs(old => old.map((row, index) => {
                        if(row.id === createdJob.id) {
                            return createdJob
                        }
                        return row
                    }))
                }
                else {
                    setJobs(prev => [...prev, createdJob])
                }
            }
            setCreateJob(false);
        }
    }

    return (
    <>
        <Grid>
            <Grid item xs={12} direction={'column'} alignItems={'center'}>
                <JobTable tableData={jobs} setRefreshTableData={setRefreshTableData} users={users} jobStages={jobStages}/>
            </Grid>
        </Grid>

        {/* Create new Dialog */}
        <CreateDialog open={createJob} onClose={handleDialogClose} jobs={jobs} clients={clients} clientContacts={clientContacts} locations={locations}/>

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