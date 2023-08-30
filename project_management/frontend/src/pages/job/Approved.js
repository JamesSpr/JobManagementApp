import React, { useState, useEffect }  from 'react';
import { useParams } from "react-router-dom";
import { Grid, Typography } from '@mui/material';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';

const Approved = () => {

    const axiosPrivate = useAxiosPrivate();
    const { input } = useParams();
    const [job, setJob] = useState({});

    useEffect(() => {
        if(input) {
            const jsonInput = JSON.parse(input.replace(new RegExp("'", 'g'), "\""));
            
            const controller = new AbortController();

            const fetchData  = async () => {
                await axiosPrivate({
                    method: 'post',
                    controller: controller.source,
                    data: JSON.stringify({
                    query: `query jobAll($po:String!, $sr:String!, $otherId:String!){
                        job_all: jobAll(po: $po, sr: $sr, otherId: $otherId){
                            edges {
                                node {
                                    id
                                    po
                                    sr
                                    otherId
                                    client {
                                        id
                                        name
                                    }
                                    requester {
                                        id
                                        firstName
                                        lastName
                                    }
                                    location {
                                        id
                                        name
                                    }
                                    building
                                    detailedLocation
                                    title
                                    priority
                                    description
                                    scope
                                    
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
                                        estimateheaderSet{
                                            id
                                            description
                                            markup
                                            gross
                                            subRows: estimateitemSet {
                                                id
                                                description
                                                quantity
                                                itemType
                                                rate
                                                extension
                                                markup
                                                gross
                                            }
                                        }	
                                    }
                                    
                                }
                            }
                        }
                    }`,
                    variables: {
                        po: jsonInput.po,
                        sr: jsonInput.sr,
                        otherId: jsonInput.other
                    },
                }),
                }).then((response) => {
                    // console.log(response);
                    const job_data = response?.data?.data?.job_all?.edges[0]?.node;
                    setJob(job_data);
                    console.log(job_data)
                }).catch((err) => {
                    // TODO: handle error
                    if(err.name === "CanceledError") {
                        return
                    }
                    console.log("Error:", err);
                });
            }  
            fetchData();
        }
        
        return () => {
            controller.abort();
        }
        
    }, [])

    return (
        <Grid container spacing={2}>
            <Grid item xs={12} align="center">
                <Typography variant="h6">Here we have a the details for an approved job. Please verify the information and confirm</Typography>
            </Grid>
            <Grid item xs={12} align="center">
                <Typography variant="p1" sx={{padding: '10px'}}><b>PO:</b> {job.po}</Typography>
                <Typography variant="p1" sx={{padding: '10px'}}><b>SR:</b> {job.sr}</Typography>
                <Typography variant="p1" sx={{padding: '10px'}}><b>OtherId:</b> {job.otherId}</Typography>
            </Grid>
            <Grid item xs={12} align="center">
                <Typography variant="h6" sx={{padding: '10px'}}>Estimates</Typography>
                {job?.estimateSet?.map(est => (
                    <Typography variant="p1" sx={{padding: '10px'}}>{est.name} - ${est.price} - Submitted on {new Date(est.issueDate).toLocaleDateString('en-AU', {timeZone: 'UTC'})}</Typography>
                ))}
            </Grid>
        </Grid>
    );
}

export default Approved;