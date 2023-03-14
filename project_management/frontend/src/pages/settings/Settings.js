import React, { useState } from 'react';
import { Box, Grid, Typography, Button, CircularProgress, Divider } from '@mui/material';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { useNavigate } from 'react-router-dom';
import Imports from './Imports';
import Transfers from './Transfers';
import { FileUploadSection, InputField } from '../../components/Components';
import { Step, Stepper } from '../../components/stepper/Stepper';

export default function Setting() {
    const axiosPrivate = useAxiosPrivate();
    const [waiting, setWaiting] = useState({});
    
    const navigate = useNavigate();
    const openInNewTab = (url) => {
        const newWindow = window.open(url, '_blank', 'noopener, noreferrer')
        if(newWindow) newWindow.opener = null
    }

    const handleExportJobData = async () => {    
        setWaiting(prev => ({...prev, "exportJob": true}));
        try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                query: `
                query jobData {
                    jobs {
                        id
                        po
                        sr
                        otherId
                        client {
                            name
                        }
                        location {
                            name
                            region {
                                shortName
                            }
                        }
                        building
                        title
                        priority
                        dateIssued
                        overdueDate
                        stage
                        estimateSet {
                            id
                            name
                            description
                            price
                            issueDate
                            approvalDate
                            quoteBy {
                                id
                            }
                        }
                        jobinvoiceSet {
                            invoice {
                                number
                                dateCreated
                                dateIssued
                                datePaid
                            }
                        }
                    }
                }
                `,
                variables: { 
                },
            }),
            }).then((response) => {
                const res = response?.data?.data;
                console.log(res);
                setWaiting(prev => ({...prev, "exportJob": false}))
            });
        } catch (err) {
            console.log("error:", err);
        }
    }

    const handleUpdateJobs = async () => {    
        setWaiting(prev => ({...prev, "JobUpdate": true}));
        try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                query: `
                mutation updateJobStatus {
                    update_job_status: updateJobStatus {
                        success
                    }
                }`,
                variables: { 
                },
            }),
            }).then((response) => {
                const res = response?.data?.data;
                console.log(res);
                setWaiting(prev => ({...prev, "JobUpdate": false}))
            });
        } catch (err) {
            console.log("error:", err);
        }
    }

    const handleTestFeature = async () => {    
        setWaiting(prev => ({...prev, "test": true}));
        try {
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                query: `
                mutation testFeature {
                    test_feature: testFeature {
                        success
                    }
                }`,
                variables: { 
                },
            }),
            }).then((response) => {
                const res = response?.data?.data;
                console.log(res);
                setWaiting(prev => ({...prev, "test": false}))
            });
        } catch (err) {
            console.log("error:", err);
        }
    
    }

    const handleRemittanceAdvice = async () => {
        setWaiting(prev => ({...prev, remittance: true}));
        const [file] = remittance_input.files;

        if (!file) {
            console.log("No File Uploaded")
            setWaiting(prev => ({...prev, remittance: false}));
            return
        }

        let fileReader = new FileReader();
        fileReader.readAsDataURL(file)
        fileReader.onload = async () => {
            let data = fileReader.result

            try {
                await axiosPrivate({
                    method: 'post',
                    data: JSON.stringify({
                    query: `
                    mutation extractRemittanceAdvice($file: String!) {
                        remittance_advice: extractRemittanceAdvice(file: $file) {
                            success
                            message
                            adviceDate
                            data {
                                invoice
                                price
                            }
                        }
                    }`,
                    variables: { 
                        file: data,
                    },
                }),
                }).then((response) => {
                    const res = response?.data?.data?.remittance_advice;
                    setWaiting(prev => ({...prev, remittance: false}));
                    console.log(res);
                });
            } catch (err) {
                console.log("error:", err);
            }
        }      
    
    }
    
    const [createCompany, setCreateCompany] = useState({'name':''})
    const handleCreateCompany = async () => {
        setWaiting(prev => ({...prev, company: true}));
        const [file] = company_logo.files;

        if (!file) {
            console.log("No File Uploaded")
            setWaiting(prev => ({...prev, company: false}));
            return
        }

        if (createCompany.name.trim() === "") {
            console.log("Company Name Required")
            setWaiting(prev => ({...prev, company: false}));
            return
        }
        
        let fileReader = new FileReader();
        fileReader.readAsDataURL(file)
        fileReader.onload = async () => {
            let data = fileReader.result
            console.log(data);

            try {
                await axiosPrivate({
                    method: 'post',
                    data: JSON.stringify({
                    query: `
                    mutation createCompany($name: String!, $logo: String!) {
                        create: createCompany(name: $name, logo: $logo) {
                            success
                            message
                        }
                    }`,
                    variables: { 
                        name: createCompany.name,
                        logo: data
                    },
                }),
                }).then((response) => {
                    const res = response?.data?.data?.create;
                    console.log(res);
                    setWaiting(prev => ({...prev, company: false}));
                });
            } catch (err) {
                console.log("error:", err);
            }
        }      
    
    }

    const [inputs, setInputs] = useState({
        'text': '',
        'number': '',
        'date': '',
        'select': '',
    });

    return (
        <Grid container spacing={2} align="center">
            <Grid item xs={12}>
                <InputField type="text" style={{width: '200px'}} label="Text" value={inputs['text']} onChange={(e) => setInputs(prev => ({...prev, 'text':e.target.value}))}/> 
                <InputField type="number" style={{width: '200px'}} label="Number" value={inputs['number']} onChange={(e) => setInputs(prev => ({...prev, 'number':e.target.value}))}/>
                <InputField type="date" style={{width: '200px'}} label="Date" value={inputs['date']} onChange={(e) => setInputs(prev => ({...prev, 'date':e.target.value}))}/>
                <InputField type="select" style={{width: '200px'}} label="Select" value={inputs['select']} onChange={(e) => setInputs(prev => ({...prev, 'select':e.target.value}))}>
                    <option key={"0"} value={''}></option>
                    <option key={"1"} value={'1'}>1</option>
                    <option key={"2"} value={'2'}>2</option>
                    <option key={"3"} value={'3'}>3</option>
                </InputField>
            </Grid>
            <Grid item xs={12} >
                <Typography variant='h6'>New Features</Typography>
                <Box sx={{ m: 1, position: 'relative' }} style={{display: 'inline-block'}}>
                    <Button variant="outlined" onClick={handleTestFeature} disabled={true}>Test Feature</Button>
                    {waiting.test && (
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
            <Grid item xs={12} >
                <Typography>Import Remittance Advice</Typography>
                <input type="file" id="remittance_input" accept='.csv' />
                <Box sx={{ m: 1, position: 'relative' }} style={{display: 'inline-block'}}>
                    <Button variant="outlined" onClick={handleRemittanceAdvice}>Upload</Button>
                    {waiting.remittance && (
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
            <Grid item xs={12} >
                <Box sx={{ m: 1, position: 'relative' }} style={{display: 'inline-block'}}>
                    <Button variant="outlined" onClick={handleUpdateJobs}>Update Jobs</Button>
                    {waiting.JobUpdate && (
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
            <Grid item xs={12} >
                <Box sx={{ m: 1, position: 'relative' }} style={{display: 'inline-block'}}>
                    <Button variant="outlined" onClick={handleExportJobData}>Export Job Data</Button>
                    {waiting.exportJob && (
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
            <Divider variant='middle' sx={{margin: '20px auto 5px auto', width:'80%'}}/>
            <Grid item xs={12}>
                <InputField type='text' label="Company Name" onChange={e => setCreateCompany(prev => ({...prev, 'name':e.target.value}))}/>
                <p>Upload Logo:</p>
                <FileUploadSection 
                    id="company_logo" button="Create Company" 
                    onSubmit={handleCreateCompany} waiting={waiting.company} 
                />
            </Grid>
            <Divider variant='middle' sx={{margin: '20px auto 5px auto', width:'80%'}}/>
                <div className='stepper-wrapper'>
                    <Stepper>
                        <Step name="Select Job">
                            <h4>Step One</h4>
                            <p>This is how we do step one...</p>
                        </Step>
                        <Step name="Check Accounts">
                            <h4>Step Two</h4>
                            <p>This is how we do step two...</p>
                        </Step>
                        <Step name="Upload Bill">
                            <h4>Step Three</h4>
                            <p>This is how we do step three...</p>
                        </Step>
                    </Stepper>            
                </div>
            <Divider variant='middle' sx={{margin: '20px auto 5px auto', width:'80%'}}/>
            <Transfers />
            <Divider variant='middle' sx={{margin: '20px auto 5px auto', width:'80%'}}/>
            <Imports />
            <Divider variant='middle' sx={{margin: '20px auto 5px auto', width:'80%'}}/>
            <div className='flex-column'>
                <pre style={{whiteSpace: 'pre-wrap'}}>
                    {JSON.stringify( ["1234", "874532"] )}
                </pre>
            </div>
        </Grid>
    );
}