import React from 'react';
import { Grid, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function Unauthorized() {
    const navigate = useNavigate();
    const goBack = () => navigate(-1);

    return (
        <Grid>
            <Typography align="center" >You do not have permissions to access this page.</Typography>
            <Grid item xs={12} align="center">
                <Button variant="outlined" onClick={goBack}>Go Back</Button>
            </Grid>
        </Grid>
    );
}