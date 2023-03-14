import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Grid, Typography } from '@mui/material';

const Missing = () => {
    const location = useLocation();
    const [missingText, setMissingText] = useState();

    useEffect(() => {
        // console.log(location?.state?.missing);
        switch(location?.state?.missing) {
            case "job":
                setMissingText("Job not found")
                break;
            case "client":
                setMissingText("Client not found")
                break;
            default:
                setMissingText("Page Not Found");
                break;
        }
    },[])

    return (
        <Grid>
            <Typography align="center" >{missingText}</Typography>
        </Grid>
    );
}

export default Missing