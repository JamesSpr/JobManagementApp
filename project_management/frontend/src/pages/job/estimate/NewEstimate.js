import React, { useEffect, useState } from 'react';
import { Grid, Typography, Button } from '@mui/material';

import useEstimate from './useEstimate';
import { InputField, Tooltip } from '../../../components/Components';

const NewEstimate = ({users, estimateData}) => {

    const { estimateSet, setEstimateSet } = useEstimate();
    const [copyOption, setCopyOption] = useState(0);
    const [valueError, setValueError] = useState(false)
    const [errorText, setErrorText] = useState("");
    const [newEstimate, setNewEstimate] = useState({
        'id': '0',
        'name': '',
        'description': '',
        'quoteBy': '',
        'price': [],
        'estimateheaderSet': [],
    });

    const handleCreateEstimate = () => {
        if(newEstimate['name'].trim() === "" ) {
            setValueError(true);
            setErrorText("Name must not be blank");
            return
        }

        // Check if the name is a duplicate
        let dupe = false
        estimateSet.map((est, i) => {
            if(newEstimate['name'].trim().toLowerCase() === est.name.trim().toLowerCase()){
                setValueError(true);
                setErrorText("Name must be unique")
                dupe = true; 
            }         
        })

        if(dupe) return

        newEstimate['name'] = newEstimate['name'].trim()
        newEstimate['scope'] = estimateSet[copyOption-1]?.scope ?? "";
        newEstimate['estimateheaderSet'] = estimateSet[copyOption-1]?.estimateheaderSet ?? [];
        newEstimate['price'] = estimateSet[copyOption-1]?.price ?? 0.00;
        newEstimate['quoteBy'] = {'id': newEstimate['quoteBy']};
        // const newEstimate = {id: "0", name: name, description: description,  price: estimatePrice, estimateheaderSet: estimateHeaderSet, quoteBy: {'id': quoter}}
        setEstimateSet(oldArray => [...oldArray, newEstimate]);
        setNewEstimate({'id': '0', 'name': '', 'description': '', 'quoteBy': '', 'price': [], 'estimateheaderSet': []});

        setValueError(false);
        setErrorText("");
    }

    const handleInput = (e) => {
        setNewEstimate(prev => ({...prev, [e.target.name]: e.target.value}));
    }
    return (
        <>
            <Grid>
                <Grid item xs={12} align="center" style={{paddingBottom: '10px'}}>
                    <Typography align="center" variant='h6' style={{paddingBottom: '10px'}}>Create New Estimate</Typography>
                    <Tooltip title={valueError ? errorText : ""}>
                        <InputField label="Name" name='name' error={valueError} value={newEstimate.name} onChange={handleInput}/>
                    </Tooltip>
                </Grid>
                <Grid item xs={12} align="center" style={{paddingBottom: '20px'}}>
                    <InputField label="Description" name="description" value={newEstimate.description} onChange={handleInput}/>
                </Grid>
                <Grid item xs={12} align="center" style={{paddingBottom: '20px'}}>
                    <InputField type="select" label="Quote By" name='quoteBy' value={newEstimate.quoter} onChange={handleInput}>
                        <option key={0} value={""}></option>
                        {
                            users?.map((usr, index) => (
                                <option key={index} value={usr.id}>{usr.firstName + ' ' + usr.lastName}</option>
                            ))
                        }
                    </InputField>
                </Grid>
                <Grid item xs={12} align="center" style={{paddingBottom: '20px'}}>
                    <InputField type="select" label="Copy Estimate" value={copyOption} onChange={(e) => {setCopyOption(e.target.value)}}>
                        <option key={0} value={"None"}>None</option>
                        {
                            estimateSet.map((est, index) => (
                                <option key={index + 1} value={index + 1}>{est.name}</option>
                            ))
                        }
                    </InputField>
                </Grid>
                <Grid item xs={12} align="center">
                    <Button variant="outlined" onClick={handleCreateEstimate} disabled={newEstimate['name'] === "" || newEstimate['quoteBy'] === ""}>Create Estimate</Button>
                </Grid>
            </Grid>
        </>
    )
}

export default NewEstimate;